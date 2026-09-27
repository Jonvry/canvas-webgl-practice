"use client";

import { useEffect, useRef } from "react";

type Vec3 = [number, number, number];
type Color = [number, number, number];
type Orbit = { angle: number; elevation: number; distance: number };

const VERTEX_SHADER = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec4 aColor;
  uniform mat4 uProjection;
  uniform mat4 uView;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  void main() {
    vPosition = aPosition;
    vNormal = aNormal;
    vColor = aColor;
    gl_Position = uProjection * uView * vec4(aPosition, 1.0);
  }
`;
const FRAGMENT_SHADER = `
  precision mediump float;
  uniform vec3 uEye;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec4 vColor;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 light = normalize(vec3(-0.5, 0.9, 0.75));
    float diffuse = max(dot(normal, light), 0.0);
    vec3 viewDirection = normalize(uEye - vPosition);
    float highlight = pow(max(dot(reflect(-light, normal), viewDirection), 0.0), 26.0) * 0.09;
    vec3 lit = vColor.rgb * (0.76 + 0.30 * diffuse) + vec3(highlight);
    gl_FragColor = vec4(lit, vColor.a);
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

function normalize([x, y, z]: Vec3): Vec3 {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function lookAt(eye: Vec3, target: Vec3) {
  const backward = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
  const right = normalize(cross([0, 1, 0], backward));
  const up = cross(backward, right);
  return new Float32Array([
    right[0], up[0], backward[0], 0,
    right[1], up[1], backward[1], 0,
    right[2], up[2], backward[2], 0,
    -dot(right, eye), -dot(up, eye), -dot(backward, eye), 1,
  ]);
}

function makeTable() {
  // Each vertex holds position, normal, and RGBA color.
  const vertices: number[] = [];
  let activeVertices = vertices;
  const add = (position: Vec3, normal: Vec3, color: Color, alpha = 1) => {
    activeVertices.push(...position, ...normal, ...color, alpha);
  };
  const triangle = (
    a: Vec3, b: Vec3, c: Vec3,
    normalA: Vec3, normalB: Vec3, normalC: Vec3,
    colorA: Color, colorB: Color, colorC: Color,
    alphaA = 1, alphaB = 1, alphaC = 1,
  ) => {
    add(a, normalA, colorA, alphaA);
    add(b, normalB, colorB, alphaB);
    add(c, normalC, colorC, alphaC);
  };

  // A soft shadow makes the feet sit on the blue background.
  const shadow: Color = [0.28, 0.39, 0.43];
  for (let segment = 0; segment < 64; segment++) {
    const first = segment * Math.PI * 2 / 64;
    const second = (segment + 1) * Math.PI * 2 / 64;
    triangle(
      [0, 0.012, 0], [1.22 * Math.cos(first), 0.012, 0.82 * Math.sin(first)], [1.22 * Math.cos(second), 0.012, 0.82 * Math.sin(second)],
      [0, 1, 0], [0, 1, 0], [0, 1, 0], shadow, shadow, shadow, 0.24, 0, 0,
    );
  }

  function lathe(profile: Array<[number, number]>, color: Color, wood = false, centerX = 0, centerZ = 0, alpha = 1) {
    const segments = 72;
    const ring = (index: number, segment: number) => {
      const [radius, y] = profile[index];
      const angle = segment * Math.PI * 2 / segments;
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      const previous = profile[Math.max(0, index - 1)];
      const next = profile[Math.min(profile.length - 1, index + 1)];
      const radiusSlope = next[0] - previous[0];
      const heightSlope = next[1] - previous[1];
      const normal = wood && y >= 1.23 ? [0, 1, 0] as Vec3 : normalize([heightSlope * cosine, -radiusSlope, heightSlope * sine]);
      const variation = wood && radius > 0.63 ? 1 + 0.012 * Math.sin(angle * 11 + y * 17) : 1;
      const tint = color.map((channel) => Math.min(channel * variation, 1)) as Color;
      return { position: [centerX + radius * cosine, y, centerZ + radius * sine] as Vec3, normal, tint };
    };
    for (let level = 0; level < profile.length - 1; level++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = ring(level, segment);
        const b = ring(level, segment + 1);
        const c = ring(level + 1, segment + 1);
        const d = ring(level + 1, segment);
        triangle(a.position, b.position, c.position, a.normal, b.normal, c.normal, a.tint, b.tint, c.tint, alpha, alpha, alpha);
        triangle(a.position, c.position, d.position, a.normal, c.normal, d.normal, a.tint, c.tint, d.tint, alpha, alpha, alpha);
      }
    }
  }

  // The little shelf sits inside the four legs.
  lathe([
    [0, 1.05], [0.5, 1.05], [0.69, 1.065], [0.79, 1.095],
    [0.82, 1.15], [0.78, 1.205], [0.63, 1.23], [0.3, 1.238], [0, 1.24],
  ], [0.84, 0.65, 0.43], true);

  function leg(top: Vec3, bottom: Vec3, index: number) {
    const axis = normalize([top[0] - bottom[0], top[1] - bottom[1], top[2] - bottom[2]]);
    const tangent = normalize(cross(axis, [0, 0, 1]));
    const bitangent = cross(axis, tangent);
    const length = Math.hypot(top[0] - bottom[0], top[1] - bottom[1], top[2] - bottom[2]);
    const rings: Array<[number, number]> = [[0, 0.065], [0.025, 0.09], [0.09, 0.098], [0.72, 0.127], [1, 0.122]];
    const segments = 28;
    const point = (ringIndex: number, segment: number) => {
      const [part, radius] = rings[ringIndex];
      const angle = segment * Math.PI * 2 / segments;
      const radial: Vec3 = [
        tangent[0] * Math.cos(angle) + bitangent[0] * Math.sin(angle),
        tangent[1] * Math.cos(angle) + bitangent[1] * Math.sin(angle),
        tangent[2] * Math.cos(angle) + bitangent[2] * Math.sin(angle),
      ];
      const center: Vec3 = [bottom[0] + axis[0] * length * part, bottom[1] + axis[1] * length * part, bottom[2] + axis[2] * length * part];
      const normal = normalize([radial[0] - axis[0] * 0.03, radial[1] - axis[1] * 0.03, radial[2] - axis[2] * 0.03]);
      const grain = 1 + 0.045 * Math.sin(angle * 6 + index * 1.7 + part * 7);
      const color: Color = [0.86 * grain, 0.67 * grain, 0.45 * grain];
      return { position: [center[0] + radial[0] * radius, center[1] + radial[1] * radius, center[2] + radial[2] * radius] as Vec3, normal, color };
    };
    for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex++) {
      for (let segment = 0; segment < segments; segment++) {
        const a = point(ringIndex, segment);
        const b = point(ringIndex, segment + 1);
        const c = point(ringIndex + 1, segment + 1);
        const d = point(ringIndex + 1, segment);
        triangle(a.position, c.position, b.position, a.normal, c.normal, b.normal, a.color, c.color, b.color);
        triangle(a.position, d.position, c.position, a.normal, d.normal, c.normal, a.color, d.color, c.color);
      }
    }
  }

  for (let index = 0; index < 4; index++) {
    const angle = Math.PI / 4 + index * Math.PI / 2;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    leg([0.73 * cosine, 1.72, 0.73 * sine], [1.03 * cosine, 0.05, 1.03 * sine], index);
  }

  // Rounded, slightly domed upholstered top.
  lathe([
    [0, 1.64], [0.67, 1.64], [0.91, 1.655], [1.04, 1.685],
    [1.12, 1.735], [1.16, 1.805], [1.155, 1.875], [1.11, 1.935],
    [1.02, 1.975], [0.82, 2.0], [0.42, 2.015], [0, 2.018],
  ], [0.91, 0.89, 0.87]);

  const opaqueCount = vertices.length / 10;
  const transparent: number[] = [];
  activeVertices = transparent;
  const cupX = 0.38;
  const cupZ = -0.08;

  // Water sits below the lip of the glass.
  lathe([
    [0, 2.032], [0.13, 2.032], [0.15, 2.045],
    [0.157, 2.245], [0.15, 2.254], [0, 2.254],
  ], [0.49, 0.77, 0.88], false, cupX, cupZ, 0.74);

  // The cup is a thin, open, tapered shell.
  lathe([
    [0, 2.023], [0.135, 2.023], [0.153, 2.043],
  ], [0.83, 0.94, 0.97], false, cupX, cupZ, 0.4);
  lathe([
    [0.153, 2.043], [0.169, 2.11], [0.18, 2.31], [0.188, 2.448],
  ], [0.82, 0.93, 0.96], false, cupX, cupZ, 0.22);

  // A rounded rim catches light and makes the clear glass readable.
  const rimColor: Color = [0.9, 0.98, 1];
  const rimSegments = 64;
  const tubeSegments = 10;
  const rim = (segment: number, tube: number) => {
    const angle = segment * Math.PI * 2 / rimSegments;
    const around = tube * Math.PI * 2 / tubeSegments;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const ringRadius = 0.188 + 0.012 * Math.cos(around);
    return {
      position: [cupX + ringRadius * cosine, 2.448 + 0.012 * Math.sin(around), cupZ + ringRadius * sine] as Vec3,
      normal: [Math.cos(around) * cosine, Math.sin(around), Math.cos(around) * sine] as Vec3,
    };
  };
  for (let segment = 0; segment < rimSegments; segment++) {
    for (let tube = 0; tube < tubeSegments; tube++) {
      const a = rim(segment, tube);
      const b = rim(segment + 1, tube);
      const c = rim(segment + 1, tube + 1);
      const d = rim(segment, tube + 1);
      triangle(a.position, b.position, c.position, a.normal, b.normal, c.normal, rimColor, rimColor, rimColor, 0.82, 0.82, 0.82);
      triangle(a.position, c.position, d.position, a.normal, c.normal, d.normal, rimColor, rimColor, rimColor, 0.82, 0.82, 0.82);
    }
  }

  return {
    data: new Float32Array([...vertices, ...transparent]),
    opaqueCount,
    transparentCount: transparent.length / 10,
  };
}

export default function TableViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbit = useRef<Orbit>({ angle: 0.42, elevation: 0.37, distance: 5.2 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const draw = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
    if (!gl) {
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#aac8d0";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#26343b";
        context.font = "20px Arial";
        context.fillText("WebGL is unavailable on this device.", 210, 300);
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
    const mesh = makeTable();
    const buffer = gl.createBuffer();
    if (!buffer) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
    const stride = 10 * Float32Array.BYTES_PER_ELEMENT;
    const position = gl.getAttribLocation(program, "aPosition");
    const normal = gl.getAttribLocation(program, "aNormal");
    const color = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(color);
    gl.vertexAttribPointer(color, 4, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    const projection = gl.getUniformLocation(program, "uProjection");
    const view = gl.getUniformLocation(program, "uView");
    const eyeUniform = gl.getUniformLocation(program, "uEye");
    gl.uniformMatrix4fv(projection, false, perspective(Math.PI / 5, canvas.width / canvas.height, 0.1, 30));
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.66, 0.79, 0.83, 1);

    draw.current = () => {
      const { angle, elevation, distance } = orbit.current;
      const eye: Vec3 = [
        Math.sin(angle) * Math.cos(elevation) * distance,
        0.94 + Math.sin(elevation) * distance,
        Math.cos(angle) * Math.cos(elevation) * distance,
      ];
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(view, false, lookAt(eye, [0, 0.96, 0]));
      gl.uniform3fv(eyeUniform, eye);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.opaqueCount);
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, mesh.opaqueCount, mesh.transparentCount);
      gl.depthMask(true);
    };
    draw.current();
    return () => {
      draw.current = () => {};
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  function zoom(amount: number) {
    orbit.current.distance = Math.max(3.8, Math.min(7.4, orbit.current.distance + amount));
    draw.current();
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        aria-label="Interactive 3D model of a cream and wood round table with a glass of water"
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const changeX = event.clientX - drag.current.x;
          const changeY = event.clientY - drag.current.y;
          orbit.current.angle += changeX * 0.008;
          orbit.current.elevation = Math.max(0.08, Math.min(1.1, orbit.current.elevation - changeY * 0.006));
          drag.current = { x: event.clientX, y: event.clientY };
          draw.current();
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        style={{ display: "block", width: "100%", height: "auto", borderRadius: 10, background: "#aac8d0", cursor: "grab", touchAction: "none" }}
      />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
        <button type="button" onClick={() => zoom(-0.3)} aria-label="Zoom in on table" style={{ width: 38, height: 36, border: "1px solid #cbd5e1", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 20 }}>+</button>
        <button type="button" onClick={() => { orbit.current = { angle: 0.42, elevation: 0.37, distance: 5.2 }; draw.current(); }} style={{ padding: "0 14px", height: 36, border: "1px solid #cbd5e1", borderRadius: 7, background: "white", cursor: "pointer" }}>Reset view</button>
        <button type="button" onClick={() => zoom(0.3)} aria-label="Zoom out from table" style={{ width: 38, height: 36, border: "1px solid #cbd5e1", borderRadius: 7, background: "white", cursor: "pointer", fontSize: 20 }}>−</button>
      </div>
    </div>
  );
}
