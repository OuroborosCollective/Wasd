import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text, Container } from "pixi.js";
import { createClient, type ServerEvent, type PlayerState, type AgentState } from "@arelorian/core-network";

const TILE_SIZE = 32;
const SCALE = 2;

function mapWorldToScreen(x: number, z: number, width: number, height: number): { sx: number; sy: number } {
  const sx = width / 2 + x * TILE_SIZE * SCALE;
  const sy = height / 2 - z * TILE_SIZE * SCALE;
  return { sx, sy };
}

interface EntityGraphics {
  graphics: Graphics;
  label: Text;
  lastX: number;
  lastZ: number;
}

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const entitiesRef = useRef<Map<string, EntityGraphics>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const app = new Application();
    appRef.current = app;

    app.init({
      background: 0x0f0f1a,
      resizeTo: canvasRef.current!,
      antialias: true
    }).then(() => {
      canvasRef.current!.appendChild(app.canvas);
      startNetwork(app);
    }).catch(setError);

    return () => {
      app.destroy(true);
    };
  }, []);

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function startNetwork(app: Application) {
    const wsUrl = import.meta.env.VITE_WS_URL || "wss://arelorian.de/ws";
    const client = createClient({ url: wsUrl });
    clientRef.current = client;

    client.on("connect" as any, () => setConnected(true));
    client.on("disconnect" as any, () => setConnected(false));

    client.connect();
  }

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
      {!connected && <div style={{ position: "absolute", top: 16, left: 16, color: "#fff" }}>Connecting...</div>}
      {error && <div style={{ position: "absolute", top: 16, left: 16, color: "#f00" }}>{error}</div>}
    </div>
  );
}
