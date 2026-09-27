"use client";

import { useEffect, useRef, useState } from "react";

export default function ShapeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rectangleColor, setRectangleColor] = useState("#7c3aed");

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;

    const background = new window.Image();

    function drawScene() {
      if (!canvas || !context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (background.complete && background.naturalWidth > 0) {
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
      }

      // Rectangle: x, y, width, height
      context.fillStyle = rectangleColor;
      context.fillRect(100, 100, 180, 120);

      // Circle: center x, center y, radius, start angle, end angle
      context.fillStyle = "#f97316";
      context.beginPath();
      context.arc(440, 160, 60, 0, Math.PI * 2);
      context.fill();

      // A plain white rounded cube made from three faces.
      const outline: [number, number][] = [
        [600, 240], [680, 280], [680, 370],
        [600, 410], [520, 370], [520, 280],
      ];

      function roundedPolygon(points: [number, number][], radius: number) {
        if (!context) return;
        context.beginPath();
        points.forEach(([x, y], index) => {
          const previous = points[(index - 1 + points.length) % points.length];
          const next = points[(index + 1) % points.length];
          const before = Math.hypot(previous[0] - x, previous[1] - y);
          const after = Math.hypot(next[0] - x, next[1] - y);
          const startX = x + (previous[0] - x) * radius / before;
          const startY = y + (previous[1] - y) * radius / before;
          const endX = x + (next[0] - x) * radius / after;
          const endY = y + (next[1] - y) * radius / after;
          if (index === 0) context.moveTo(startX, startY);
          else context.lineTo(startX, startY);
          context.quadraticCurveTo(x, y, endX, endY);
        });
        context.closePath();
      }

      function face(points: [number, number][], color: string) {
        if (!context) return;
        context.beginPath();
        context.moveTo(points[0][0], points[0][1]);
        for (const [x, y] of points.slice(1)) context.lineTo(x, y);
        context.closePath();
        context.fillStyle = color;
        context.fill();
      }

      context.save();
      context.shadowColor = "#33415555";
      context.shadowBlur = 18;
      context.shadowOffsetY = 10;
      roundedPolygon(outline, 16);
      context.fillStyle = "#ffffff";
      context.fill();
      context.restore();

      context.save();
      roundedPolygon(outline, 16);
      context.clip();
      face([[600, 240], [680, 280], [600, 320], [520, 280]], "#ffffff"); // top
      face([[520, 280], [600, 320], [600, 410], [520, 370]], "#ffffff"); // left
      face([[600, 320], [680, 280], [680, 370], [600, 410]], "#ffffff"); // right
      context.beginPath();
      context.moveTo(520, 280);
      context.lineTo(600, 320);
      context.lineTo(680, 280);
      context.moveTo(600, 320);
      context.lineTo(600, 410);
      context.strokeStyle = "#a9b4bf";
      context.lineWidth = 1.5;
      context.stroke();
      context.restore();
      roundedPolygon(outline, 16);
      context.strokeStyle = "#9aa7b4";
      context.lineWidth = 2;
      context.stroke();
    }

    background.onload = drawScene;
    background.onerror = drawScene;
    background.src = "/canvas-background.svg";
    return () => { background.onload = null; background.onerror = null; };
  }, [rectangleColor]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 800, margin: "0 auto" }}>
      <canvas
        ref={canvasRef}
        id="practice-canvas"
        width={800}
        height={500}
        aria-label="Landscape background with a rectangle, circle, and white cube"
        style={{ display: "block", width: "100%", height: "auto", background: "white", border: "1px solid #d4d4d8" }}
      />
      <button
        type="button"
        onClick={() => setRectangleColor((current) => current === "#7c3aed" ? "#16a34a" : "#7c3aed")}
        style={{ position: "absolute", left: 20, bottom: 20, padding: "10px 16px", border: 0, borderRadius: 8, background: "#1f2937", color: "white", fontWeight: 600, cursor: "pointer" }}
      >
        Change rectangle color
      </button>
    </div>
  );
}
