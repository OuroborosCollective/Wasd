import { PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";

type MoveVector = { dx: number; dz: number };

export function MobileMovePad() {
  const vector = useRef<MoveVector>({ dx: 0, dz: 0 });
  const activePointerId = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const { dx, dz } = vector.current;
      if (!dx && !dz) return;
      window.__wasd2dMove?.({ dx, dz });
    }, 110);

    const releaseAll = () => release();
    window.addEventListener("blur", releaseAll);
    window.addEventListener("contextmenu", releaseAll);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("blur", releaseAll);
      window.removeEventListener("contextmenu", releaseAll);
      releaseAll();
    };
  }, []);

  function hold(next: MoveVector, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    activePointerId.current = event.pointerId;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    vector.current = next;
    window.__wasd2dMove?.(next);
  }

  function release(event?: ReactPointerEvent<HTMLButtonElement>) {
    event?.preventDefault();
    event?.stopPropagation();
    if (event && activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
    vector.current = { dx: 0, dz: 0 };
    activePointerId.current = null;
  }

  return (
    <nav className="az-touch-pad" aria-label="Mobile movement controls" style={{ touchAction: "none", userSelect: "none" }}>
      <button className="up" onPointerDown={(event) => hold({ dx: 0, dz: 1 }, event)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} aria-label="Move up">▲</button>
      <button className="left" onPointerDown={(event) => hold({ dx: -1, dz: 0 }, event)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} aria-label="Move left">◀</button>
      <button className="right" onPointerDown={(event) => hold({ dx: 1, dz: 0 }, event)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} aria-label="Move right">▶</button>
      <button className="down" onPointerDown={(event) => hold({ dx: 0, dz: -1 }, event)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} aria-label="Move down">▼</button>
    </nav>
  );
}
