import { useEffect, useRef } from "react";

type MoveVector = { dx: number; dz: number };

export function MobileMovePad() {
  const vector = useRef<MoveVector>({ dx: 0, dz: 0 });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const { dx, dz } = vector.current;
      if (!dx && !dz) return;
      window.__wasd2dMove?.({ dx, dz });
    }, 150);

    return () => {
      window.clearInterval(timer);
      release();
    };
  }, []);

  function hold(next: MoveVector) {
    vector.current = next;
    window.__wasd2dMove?.(next);
  }

  function release() {
    vector.current = { dx: 0, dz: 0 };
  }

  return (
    <nav className="az-touch-pad" aria-label="Mobile movement controls" style={{ touchAction: "none", userSelect: "none" }}>
      <button className="up" onPointerDown={(event) => { event.preventDefault(); hold({ dx: 0, dz: 1 }); }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▲</button>
      <button className="left" onPointerDown={(event) => { event.preventDefault(); hold({ dx: -1, dz: 0 }); }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>◀</button>
      <button className="right" onPointerDown={(event) => { event.preventDefault(); hold({ dx: 1, dz: 0 }); }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▶</button>
      <button className="down" onPointerDown={(event) => { event.preventDefault(); hold({ dx: 0, dz: -1 }); }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▼</button>
    </nav>
  );
}
