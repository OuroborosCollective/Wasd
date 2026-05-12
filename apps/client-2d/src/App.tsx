import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { createClient, type PlayerState, type AgentState } from "@arelorian/core-network";

const TILE_SIZE = 32;
const SCALE = 2;

function mapWorldToScreen(x: number, z: number, width: number, height: number): { sx: number; sy: number } {
  // Top-down view: X maps to screen X, Z maps to screen Y (inverted)
  const sx = width / 2 + x * TILE_SIZE * SCALE;
  const sy = height / 2 - z * TILE_SIZE * SCALE;
  return { sx, sy };
}

interface EntityGraphics {
  graphics: Graphics;
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
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    }).then(() => {
      canvasRef.current!.appendChild(app.canvas);
      startNetwork(app);
    }).catch(setError);

    return () => {
      clientRef.current?.disconnect();
      app.destroy(true);
    };
  }, []);

  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  function startNetwork(app: Application) {
    const client = createClient({
      url: "https://arelorian.de",
      heartbeatInterval: 30000
    });
    clientRef.current = client;

    // Connection status
    client.on("connect" as any, () => setConnected(true));
    client.on("disconnect" as any, () => setConnected(false));

    // Handle world state
    client.on("WORLD_HEARTBEAT", (event) => {
      if (event.type === "WORLD_HEARTBEAT") {
        const { players, agents } = event.payload;
        updateEntities(app, players, agents);
      }
    });

    // Handle player events
    client.on("PLAYER_JOINED", (event) => {
      if (event.type === "PLAYER_JOINED") {
        console.log("Player joined:", event.payload.name);
      }
    });

    client.on("PLAYER_LEFT", (event) => {
      if (event.type === "PLAYER_LEFT") {
        removeEntity(event.payload.playerId);
      }
    });

    client.on("PLAYER_MOVED", (event) => {
      if (event.type === "PLAYER_MOVED") {
        moveEntity(event.payload.playerId, event.payload.x, event.payload.z);
      }
    });

    // Handle agent events
    client.on("AGENT_SPAWNED", (event) => {
      if (event.type === "AGENT_SPAWNED") {
        addEntity(event.payload.id, event.payload.x, event.payload.z, event.payload.name, 0x00ff00);
      }
    });

    client.on("AGENT_MOVED", (event) => {
      if (event.type === "AGENT_MOVED") {
        moveEntity(event.payload.agentId, event.payload.x, event.payload.z);
      }
    });

    client.connect();
  }

  function updateEntities(app: Application, players: Map<string, PlayerState>, agents: Map<string, AgentState>) {
    const { width, height } = app.screen;

    // Update players
    players.forEach((player, id) => {
      if (!entitiesRef.current.has(id)) {
        addEntity(id, player.x, player.z, player.name, 0x4488ff);
      } else {
        updateEntityPosition(id, player.x, player.z, width, height);
      }
    });

    // Update agents
    agents.forEach((agent, id) => {
      if (!entitiesRef.current.has(id)) {
        addEntity(id, agent.x, agent.z, agent.name, 0x00ff00);
      } else {
        updateEntityPosition(id, agent.x, agent.z, width, height);
      }
    });
  }

  function addEntity(id: string, x: number, z: number, name: string, color: number) {
    if (!appRef.current) return;
    const app = appRef.current;
    const { width, height } = app.screen;
    const { sx, sy } = mapWorldToScreen(x, z, width, height);

    const graphics = new Graphics();
    graphics.rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    graphics.fill(color);
    graphics.x = sx;
    graphics.y = sy;

    const label = new Text({ text: name, style: { fontSize: 10, fill: 0xffffff } });
    label.x = sx - label.width / 2;
    label.y = sy - TILE_SIZE;

    app.stage.addChild(graphics);
    app.stage.addChild(label);

    entitiesRef.current.set(id, { graphics, lastX: x, lastZ: z });
  }

  function moveEntity(id: string, _x: number, _z: number) {
    const entity = entitiesRef.current.get(id);
    if (!entity || !appRef.current) return;
    appRef.current.stage.addChild(entity.graphics);
  }

  function updateEntityPosition(id: string, x: number, z: number, width: number, height: number) {
    const entity = entitiesRef.current.get(id);
    if (!entity) return;
    const { sx, sy } = mapWorldToScreen(x, z, width, height);
    entity.graphics.x = sx;
    entity.graphics.y = sy;
    entity.lastX = x;
    entity.lastZ = z;
  }

  function removeEntity(id: string) {
    const entity = entitiesRef.current.get(id);
    if (!entity || !appRef.current) return;
    appRef.current.stage.removeChild(entity.graphics);
    entity.graphics.destroy();
    entitiesRef.current.delete(id);
  }

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
      {!connected && <div style={{ position: "absolute", top: 16, left: 16, color: "#fff" }}>Connecting...</div>}
      {error && <div style={{ position: "absolute", top: 16, left: 16, color: "#f00" }}>{error}</div>}
    </div>
  );
}
