"use client";

import { useEffect, useRef } from "react";
import TouchControls from "./touch-controls";

type Point3 = [number, number, number];
type Color = [number, number, number];
type Box = { x: number; z: number; width: number; depth: number; height: number; color: Color };

const BOXES: Box[] = [
  { x: -7.2, z: -5, width: 0.5, depth: 25, height: 3.1, color: [0.22, 0.42, 0.54] },
  { x: 7.2, z: -5, width: 0.5, depth: 25, height: 3.1, color: [0.22, 0.42, 0.54] },
  { x: 0, z: -17.3, width: 14.8, depth: 0.5, height: 3.1, color: [0.32, 0.52, 0.6] },
  { x: -3.4, z: -3, width: 0.75, depth: 0.75, height: 3.3, color: [0.3, 0.74, 0.7] },
  { x: 3.4, z: -3, width: 0.75, depth: 0.75, height: 3.3, color: [0.3, 0.74, 0.7] },
  { x: -3.4, z: -8, width: 0.75, depth: 0.75, height: 3.3, color: [0.86, 0.55, 0.34] },
  { x: 3.4, z: -8, width: 0.75, depth: 0.75, height: 3.3, color: [0.86, 0.55, 0.34] },
  { x: -3.4, z: -13, width: 0.75, depth: 0.75, height: 3.3, color: [0.3, 0.74, 0.7] },
  { x: 3.4, z: -13, width: 0.75, depth: 0.75, height: 3.3, color: [0.3, 0.74, 0.7] },
  { x: 1.3, z: -6.5, width: 1.4, depth: 1.4, height: 1.4, color: [0.78, 0.5, 0.88] },
  { x: -1.5, z: -11, width: 1.5, depth: 1.5, height: 1.5, color: [0.94, 0.65, 0.35] },
];

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  varying vec3 vColor;
  varying float vFog;
  void main() {
    vec4 viewPosition = uView * vec4(aPosition, 1.0);
    gl_Position = uProjection * viewPosition;
    vColor = aColor;
    vFog = clamp((-viewPosition.z - 4.0) / 24.0, 0.0, 0.78);
  }
`;
const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec3 vColor;
  varying float vFog;
  void main() {
    gl_FragColor = vec4(mix(vColor, vec3(0.07, 0.12, 0.19), vFog), 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

function perspective(fieldOfView: number, aspect: number, near: number, far: number) {
  const scale = 1 / Math.tan(fieldOfView / 2);
  return new Float32Array([
    scale / aspect, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, 2 * far * near / (near - far), 0,
  ]);
}

function viewMatrix(x: number, z: number, angle: number, pitch: number) {
  // Camera axes: right, up, and backward. Pitch tilts the view vertically.
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  const pitchSine = Math.sin(pitch);
  const pitchCosine = Math.cos(pitch);
  return new Float32Array([
    cosine, -sine * pitchSine, -sine * pitchCosine, 0,
    0, pitchCosine, -pitchSine, 0,
    sine, cosine * pitchSine, cosine * pitchCosine, 0,
    -cosine * x - sine * z,
    sine * pitchSine * x - pitchCosine * 1.6 - cosine * pitchSine * z,
    sine * pitchCosine * x + pitchSine * 1.6 - cosine * pitchCosine * z,
    1,
  ]);
}

function makeScene() {
  const vertices: number[] = [];
  const addVertex = (point: Point3, color: Color) => vertices.push(...point, ...color);
  const triangle = (a: Point3, b: Point3, c: Point3, color: Color) => {
    addVertex(a, color); addVertex(b, color); addVertex(c, color);
  };
  const quad = (a: Point3, b: Point3, c: Point3, d: Point3, color: Color) => {
    triangle(a, b, c, color); triangle(a, c, d, color);
  };
  const tint = (color: Color, amount: number): Color => color.map((value) => Math.min(value * amount, 1)) as Color;
  const box = ({ x, z, width, depth, height, color }: Box) => {
    const left = x - width / 2, right = x + width / 2;
    const front = z + depth / 2, back = z - depth / 2;
    quad([left, 0, front], [right, 0, front], [right, height, front], [left, height, front], tint(color, 1));
    quad([right, 0, back], [left, 0, back], [left, height, back], [right, height, back], tint(color, 0.65));
    quad([left, 0, back], [left, 0, front], [left, height, front], [left, height, back], tint(color, 0.78));
    quad([right, 0, front], [right, 0, back], [right, height, back], [right, height, front], tint(color, 0.88));
    quad([left, height, front], [right, height, front], [right, height, back], [left, height, back], tint(color, 1.22));
  };

  quad([-10, -0.02, 8], [10, -0.02, 8], [10, -0.02, -20], [-10, -0.02, -20], [0.14, 0.21, 0.27]);
  BOXES.forEach(box);
  const triangleCount = vertices.length / 6;
  const gridColor: Color = [0.24, 0.34, 0.41];
  for (let x = -7; x <= 7; x++) {
    addVertex([x, 0.005, 7], gridColor);
    addVertex([x, 0.005, -18], gridColor);
  }
  for (let z = 7; z >= -18; z--) {
    addVertex([-7, 0.005, z], gridColor);
    addVertex([7, 0.005, z], gridColor);
  }
  return { data: new Float32Array(vertices), triangleCount, lineCount: vertices.length / 6 - triangleCount };
}

export default function WebglCamera() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchKeys = useRef(new Set<string>());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) {
      const fallback = canvas.getContext("2d");
      if (fallback) {
        fallback.fillStyle = "#172b3c";
        fallback.fillRect(0, 0, canvas.width, canvas.height);
        fallback.fillStyle = "white";
        fallback.font = "20px Arial";
        fallback.fillText("WebGL is unavailable in this browser.", 190, 225);
      }
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    const scene = makeScene();
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.data, gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "aPosition");
    const color = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 3, gl.FLOAT, false, 24, 12);
    const projection = gl.getUniformLocation(program, "uProjection");
    const view = gl.getUniformLocation(program, "uView");
    gl.uniformMatrix4fv(projection, false, perspective(Math.PI / 2.8, canvas.width / canvas.height, 0.1, 60));
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.07, 0.12, 0.19, 1);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const keys = new Set<string>();
    const heldTouchKeys = touchKeys.current;
    const pressed = (key: string) => keys.has(key) || heldTouchKeys.has(key);
    const camera = { x: 0, z: 5, angle: 0, pitch: 0 };
    let frame = 0;
    let previousTime = 0;
    const canMove = (x: number, z: number) =>
      x > -6.6 && x < 6.6 && z > -16.6 && z < 6.5 &&
      !BOXES.slice(3).some((box) => Math.abs(x - box.x) < box.width / 2 + 0.25 && Math.abs(z - box.z) < box.depth / 2 + 0.25);

    function onKeyDown(event: KeyboardEvent) {
      if (document.activeElement !== canvas) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keys.add(key);
      }
    }
    function onKeyUp(event: KeyboardEvent) { keys.delete(event.key.toLowerCase()); }
    function onBlur() { keys.clear(); }

    function render(time: number) {
      if (!gl || !canvas) return;
      const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
      previousTime = time;
      if (pressed("arrowleft")) camera.angle -= 1.9 * delta;
      if (pressed("arrowright")) camera.angle += 1.9 * delta;
      if (pressed("arrowup") || pressed("look-up")) camera.pitch = Math.min(1.15, camera.pitch + 1.4 * delta);
      if (pressed("arrowdown") || pressed("look-down")) camera.pitch = Math.max(-1.15, camera.pitch - 1.4 * delta);
      const forward = Number(pressed("w")) - Number(pressed("s"));
      const sideways = Number(pressed("d")) - Number(pressed("a"));
      const stepX = (Math.sin(camera.angle) * forward + Math.cos(camera.angle) * sideways) * 2.8 * delta;
      const stepZ = (-Math.cos(camera.angle) * forward + Math.sin(camera.angle) * sideways) * 2.8 * delta;
      if (canMove(camera.x + stepX, camera.z)) camera.x += stepX;
      if (canMove(camera.x, camera.z + stepZ)) camera.z += stepZ;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(view, false, viewMatrix(camera.x, camera.z, camera.angle, camera.pitch));
      gl.drawArrays(gl.TRIANGLES, 0, scene.triangleCount);
      gl.drawArrays(gl.LINES, scene.triangleCount, scene.lineCount);
      frame = requestAnimationFrame(render);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("blur", onBlur);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("blur", onBlur);
      heldTouchKeys.clear();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <>
    <canvas
      ref={canvasRef}
      width={800}
      height={450}
      tabIndex={0}
      onPointerDown={() => canvasRef.current?.focus()}
      aria-label="WebGL first-person 3D gallery"
      style={{ display: "block", width: "100%", height: "auto", background: "#172b3c", border: "1px solid #d4d4d8", outlineColor: "#7c3aed" }}
    />
    <TouchControls withTilt onPress={(key) => touchKeys.current.add(key)} onRelease={(key) => touchKeys.current.delete(key)} />
    </>
  );
}
