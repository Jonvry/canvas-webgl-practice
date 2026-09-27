import ShapeCanvas from "./shape-canvas";
import PovCamera from "./pov-camera";
import WebglCamera from "./webgl-camera";
import TableViewer from "./table-viewer";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", padding: "40px 20px", background: "#f4f4f5" }}>
      <ShapeCanvas />
      <section style={{ width: "100%", maxWidth: 800, margin: "36px auto 0" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, color: "#1f2937" }}>First-person camera</h2>
        <p style={{ margin: "0 0 14px", color: "#5b6470", fontSize: 14 }}>
          On your phone, hold the controls below. With a keyboard, click the canvas, then use W/S to move, A/D to strafe, and ←/→ to turn.
        </p>
        <PovCamera />
      </section>
      <section style={{ width: "100%", maxWidth: 800, margin: "36px auto 0" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, color: "#1f2937" }}>WebGL camera</h2>
        <p style={{ margin: "0 0 14px", color: "#5b6470", fontSize: 14 }}>
          On your phone, hold the controls below. With a keyboard, click this canvas, then use W/S to move, A/D to strafe, ←/→ to turn, and ↑/↓ to look up or down.
        </p>
        <WebglCamera />
      </section>
      <section style={{ width: "100%", maxWidth: 800, margin: "36px auto 0" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 24, color: "#1f2937" }}>3D reference table</h2>
        <p style={{ margin: "0 0 14px", color: "#5b6470", fontSize: 14 }}>
          Drag to rotate the model. Use the buttons to zoom or reset the view.
        </p>
        <TableViewer />
      </section>
    </main>
  );
}
