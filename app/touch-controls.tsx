"use client";

type Props = {
  onPress: (key: string) => void;
  onRelease: (key: string) => void;
  withTilt?: boolean;
};

const controls = [
  { key: "arrowleft", symbol: "↶", label: "Turn left" },
  { key: "w", symbol: "↑", label: "Forward" },
  { key: "arrowright", symbol: "↷", label: "Turn right" },
  { key: "a", symbol: "←", label: "Strafe left" },
  { key: "s", symbol: "↓", label: "Backward" },
  { key: "d", symbol: "→", label: "Strafe right" },
];

export default function TouchControls({ onPress, onRelease, withTilt = false }: Props) {
  function button(key: string, symbol: string, label: string, wide = false) {
    return (
      <button
        key={key}
        type="button"
        aria-label={label}
        title={label}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          onPress(key);
        }}
        onPointerUp={() => onRelease(key)}
        onPointerCancel={() => onRelease(key)}
        onLostPointerCapture={() => onRelease(key)}
        style={{ width: wide ? 88 : 56, height: 48, border: "1px solid #9ca3af", borderRadius: 9, background: "#1f2937", color: "white", fontSize: wide ? 14 : 24, fontWeight: wide ? 600 : 400, cursor: "pointer", touchAction: "none", userSelect: "none" }}
      >
        {symbol}
      </button>
    );
  }

  return (
    <div aria-label="Camera touch controls">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 56px)", gap: 8, justifyContent: "center", marginTop: 14 }}>
        {controls.map(({ key, symbol, label }) => button(key, symbol, label))}
      </div>
      {withTilt && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
          {button("look-up", "Look ↑", "Tilt camera up", true)}
          {button("look-down", "Look ↓", "Tilt camera down", true)}
        </div>
      )}
    </div>
  );
}
