"use client";

import { useEffect, useRef } from "react";
import TouchControls from "./touch-controls";

const MAP = [
  "111111111111",
  "100000000001",
  "100000200001",
  "100000000001",
  "100011100001",
  "100000100001",
  "100000000001",
  "100001000001",
  "100000002001",
  "111111111111",
];

const FIELD_OF_VIEW = Math.PI / 3;
const MOVE_SPEED = 2.5;
const TURN_SPEED = 2.2;

export default function PovCamera() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchKeys = useRef(new Set<string>());

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const keys = new Set<string>();
    const heldTouchKeys = touchKeys.current;
    const pressed = (key: string) => keys.has(key) || heldTouchKeys.has(key);
    const player = { x: 2.5, y: 2.5, angle: 0.35 };
    let frame = 0;
    let previousTime = 0;

    function isOpen(x: number, y: number) {
      const radius = 0.18;
      for (const offsetX of [-radius, radius]) {
        for (const offsetY of [-radius, radius]) {
          if (MAP[Math.floor(y + offsetY)]?.[Math.floor(x + offsetX)] !== "0") return false;
        }
      }
      return true;
    }

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
      if (!canvas || !context) return;
      const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
      previousTime = time;

      if (pressed("arrowleft")) player.angle -= TURN_SPEED * delta;
      if (pressed("arrowright")) player.angle += TURN_SPEED * delta;
      const forward = Number(pressed("w") || pressed("arrowup")) - Number(pressed("s") || pressed("arrowdown"));
      const sideways = Number(pressed("d")) - Number(pressed("a"));
      const stepX = (Math.cos(player.angle) * forward - Math.sin(player.angle) * sideways) * MOVE_SPEED * delta;
      const stepY = (Math.sin(player.angle) * forward + Math.cos(player.angle) * sideways) * MOVE_SPEED * delta;
      if (isOpen(player.x + stepX, player.y)) player.x += stepX;
      if (isOpen(player.x, player.y + stepY)) player.y += stepY;

      const width = canvas.width;
      const height = canvas.height;
      const sky = context.createLinearGradient(0, 0, 0, height / 2);
      sky.addColorStop(0, "#182d46");
      sky.addColorStop(1, "#668aa2");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height / 2);
      const floor = context.createLinearGradient(0, height / 2, 0, height);
      floor.addColorStop(0, "#53606a");
      floor.addColorStop(1, "#202c35");
      context.fillStyle = floor;
      context.fillRect(0, height / 2, width, height / 2);

      // Cast one ray for every two screen pixels.
      for (let column = 0; column < width; column += 2) {
        const cameraX = (2 * (column + 1) / width - 1) * Math.tan(FIELD_OF_VIEW / 2);
        const rayAngle = player.angle + Math.atan(cameraX);
        const directionX = Math.cos(rayAngle);
        const directionY = Math.sin(rayAngle);
        const deltaX = Math.abs(1 / directionX);
        const deltaY = Math.abs(1 / directionY);
        let cellX = Math.floor(player.x);
        let cellY = Math.floor(player.y);
        const stepCellX = directionX < 0 ? -1 : 1;
        const stepCellY = directionY < 0 ? -1 : 1;
        let distanceX = (directionX < 0 ? player.x - cellX : cellX + 1 - player.x) * deltaX;
        let distanceY = (directionY < 0 ? player.y - cellY : cellY + 1 - player.y) * deltaY;
        let side = 0;
        let wall = "0";

        while (wall === "0") {
          if (distanceX < distanceY) {
            distanceX += deltaX;
            cellX += stepCellX;
            side = 0;
          } else {
            distanceY += deltaY;
            cellY += stepCellY;
            side = 1;
          }
          wall = MAP[cellY]?.[cellX] ?? "1";
        }

        const distance = side === 0 ? distanceX - deltaX : distanceY - deltaY;
        const corrected = Math.max(0.1, distance * Math.cos(rayAngle - player.angle));
        const wallHeight = Math.min(height * 2, height * 0.76 / corrected);
        const brightness = Math.max(0.3, 1 - distance / 13) * (side ? 0.78 : 1);
        const base = wall === "2" ? [226, 165, 97] : [114, 194, 197];
        context.fillStyle = `rgb(${Math.round(base[0] * brightness)}, ${Math.round(base[1] * brightness)}, ${Math.round(base[2] * brightness)})`;
        context.fillRect(column, (height - wallHeight) / 2, 2, wallHeight);
      }

      // Small map showing the player's position and direction.
      const tile = 10;
      const mapX = 17;
      const mapY = 17;
      context.fillStyle = "#071825bd";
      context.fillRect(mapX - 7, mapY - 7, MAP[0].length * tile + 14, MAP.length * tile + 14);
      MAP.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          context.fillStyle = row[x] === "0" ? "#263c4b" : row[x] === "2" ? "#d99b5d" : "#83bfc1";
          context.fillRect(mapX + x * tile + 1, mapY + y * tile + 1, tile - 2, tile - 2);
        }
      });
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(mapX + player.x * tile, mapY + player.y * tile, 3.5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(mapX + player.x * tile, mapY + player.y * tile);
      context.lineTo(mapX + (player.x + Math.cos(player.angle) * 1.2) * tile, mapY + (player.y + Math.sin(player.angle) * 1.2) * tile);
      context.stroke();

      context.strokeStyle = "#ffffffaa";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(width / 2 - 8, height / 2);
      context.lineTo(width / 2 + 8, height / 2);
      context.moveTo(width / 2, height / 2 - 8);
      context.lineTo(width / 2, height / 2 + 8);
      context.stroke();
      frame = requestAnimationFrame(render);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("blur", onBlur);
    render(performance.now());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("blur", onBlur);
      heldTouchKeys.clear();
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
      aria-label="First-person maze view with a minimap"
      style={{ display: "block", width: "100%", height: "auto", background: "#182d46", border: "1px solid #d4d4d8", outlineColor: "#7c3aed" }}
    />
    <TouchControls onPress={(key) => touchKeys.current.add(key)} onRelease={(key) => touchKeys.current.delete(key)} />
    </>
  );
}
