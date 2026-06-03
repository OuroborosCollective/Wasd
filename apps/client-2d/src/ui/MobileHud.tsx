import React from "react";
import type { InputBuffer } from "../logic/inputBuffer";

interface Props {
  input: InputBuffer;
}

export function MobileHud({ input }: Props) {
  const stickRef = React.useRef<HTMLDivElement | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);

  function updateStick(event: React.PointerEvent<HTMLDivElement>): void {
    const element = stickRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const radius = rect.width / 2;

    input.setMove(dx / radius, dy / radius);
    input.setPointer(event.clientX, event.clientY);
  }

  function releaseStick(): void {
    pointerIdRef.current = null;
    input.setMove(0, 0);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 7,
        pointerEvents: "none",
        touchAction: "none"
      }}
    >
      <div
        ref={stickRef}
        onPointerDown={(event) => {
          pointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateStick(event);
        }}
        onPointerMove={(event) => {
          if (pointerIdRef.current === event.pointerId) {
            updateStick(event);
          }
        }}
        onPointerUp={releaseStick}
        onPointerCancel={releaseStick}
        style={{
          position: "absolute",
          left: 22,
          bottom: 28,
          width: 118,
          height: 118,
          borderRadius: 999,
          border: "1px solid rgba(0,229,255,.35)",
          background: "rgba(0,0,0,.25)",
          boxShadow: "0 0 24px rgba(0,229,255,.12)",
          pointerEvents: "auto",
          touchAction: "none"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 42,
            height: 42,
            transform: "translate(-50%, -50%)",
            borderRadius: 999,
            background: "rgba(0,229,255,.42)"
          }}
        />
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          input.setSkill1(true);
        }}
        style={{
          position: "absolute",
          right: 24,
          bottom: 34,
          width: 86,
          height: 86,
          borderRadius: 999,
          border: "1px solid rgba(255,122,0,.55)",
          background: "rgba(255,122,0,.22)",
          color: "#fff",
          fontWeight: 800,
          pointerEvents: "auto",
          touchAction: "none"
        }}
      >
        SKILL
      </button>
    </div>
  );
}