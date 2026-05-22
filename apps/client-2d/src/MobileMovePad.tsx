import { useEffect, useRef } from "react";
import { createClient } from "@wasd/core-network";

type MoveVector = { dx: number; dz: number };

export function MobileMovePad() {
  const vector = useRef<MoveVector>({ dx: 0, dz: 0 });
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const client = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = client;
    client.connect();

    const timer = window.setInterval(() => {
      const { dx, dz } = vector.current;
      if (!dx && !dz) return;
      if (!client.connected) return;
      client.sendPlayerAction("MOVE", { dx, dz });
    }, 150);

    return () => {
      window.clearInterval(timer);
      client.disconnect();
    };
  }, []);

  function hold(next: MoveVector) {
    vector.current = next;
  }

  function release() {
    vector.current = { dx: 0, dz: 0 };
  }

  return (
    <nav className="az-touch-pad" aria-label="Mobile movement controls">
      <button className="up" onPointerDown={() => hold({ dx: 0, dz: 1 })} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▲</button>
      <button className="left" onPointerDown={() => hold({ dx: -1, dz: 0 })} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>◀</button>
      <button className="right" onPointerDown={() => hold({ dx: 1, dz: 0 })} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▶</button>
      <button className="down" onPointerDown={() => hold({ dx: 0, dz: -1 })} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>▼</button>
    </nav>
  );
}
