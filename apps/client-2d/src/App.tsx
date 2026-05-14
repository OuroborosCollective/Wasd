import { useEffect, useRef, useState, useCallback } from "react";
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
  targetWorldX: number;
  targetWorldZ: number;
}

interface JoystickState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  dx: number;
  dy: number;
}

export function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const entitiesRef = useRef<Map<string, EntityGraphics>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showJoystick, setShowJoystick] = useState(false);
  
  const keysRef = useRef<Set<string>>(new Set());
  const moveCooldownRef = useRef<number>(0);
  const joystickRef = useRef<JoystickState>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 });
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth < 768 
        || ('ontouchstart' in window);
      setIsMobile(mobile);
      setShowJoystick(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

    client.on("connect" as any, () => setConnected(true));
    client.on("disconnect" as any, () => setConnected(false));

    client.on("WORLD_HEARTBEAT", (event: { payload: { players: Record<string, PlayerState>; agents: Record<string, AgentState> } }) => {
      const { players, agents } = event.payload;
      updateEntities(app, players, agents);
    });

    client.on("PLAYER_JOINED", (event: { payload: { playerId: string; name: string } }) => {
      console.log("Player joined:", event.payload.name);
    });

    client.on("PLAYER_LEFT", (event: { payload: { playerId: string } }) => {
      removeEntity(event.payload.playerId);
    });

    client.on("PLAYER_MOVED", (event: { payload: { playerId: string; x: number; z: number } }) => {
      moveEntity(event.payload.playerId, event.payload.x, event.payload.z);
    });

    client.on("AGENT_SPAWNED", (event: { payload: AgentState }) => {
      addEntity(event.payload.id, event.payload.x, event.payload.z, event.payload.name, 0x00ff00);
    });

    client.on("AGENT_MOVED", (event: { payload: { agentId: string; x: number; z: number } }) => {
      moveEntity(event.payload.agentId, event.payload.x, event.payload.z);
    });

    client.connect();

    // Smooth movement lerping in game loop
    app.ticker.add(() => {
      // Keyboard input
      const keys = keysRef.current;
      let dx = 0, dz = 0;
      if (keys.has('w') || keys.has('arrowup')) dz += 1;
      if (keys.has('s') || keys.has('arrowdown')) dz -= 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      
      // Joystick input
      if (joystickRef.current.active) {
        dx = joystickRef.current.dx;
        dz = -joystickRef.current.dy;
      }
      
      const now = Date.now();
      if ((dx !== 0 || dz !== 0) && clientRef.current?.connected && now - moveCooldownRef.current >= 150) {
        moveCooldownRef.current = now;
        clientRef.current.sendPlayerAction("MOVE", { dx, dz });
      }
      
      // Lerp all entities smoothly to their target positions
      const { width, height } = app.screen;
      entitiesRef.current.forEach((entity) => {
        const { sx, sy } = mapWorldToScreen(entity.targetWorldX, entity.targetWorldZ, width, height);
        entity.graphics.x += (sx - entity.graphics.x) * 0.15;
        entity.graphics.y += (sy - entity.graphics.y) * 0.15;
        entity.label.x = entity.graphics.x - entity.label.width / 2;
        entity.label.y = entity.graphics.y - TILE_SIZE - 12;
      });
    });
  }

  function updateEntities(app: Application, players: Record<string, PlayerState>, agents: Record<string, AgentState>) {
    const { width, height } = app.screen;

    Object.entries(players).forEach(([id, player]) => {
      if (!entitiesRef.current.has(id)) {
        addEntity(id, player.x, player.z, player.name, 0x4488ff);
      } else {
        entitiesRef.current.get(id)!.targetWorldX = player.x;
        entitiesRef.current.get(id)!.targetWorldZ = player.z;
      }
    });

    Object.entries(agents).forEach(([id, agent]) => {
      if (!entitiesRef.current.has(id)) {
        addEntity(id, agent.x, agent.z, agent.name, 0x00ff00);
      } else {
        entitiesRef.current.get(id)!.targetWorldX = agent.x;
        entitiesRef.current.get(id)!.targetWorldZ = agent.z;
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
    graphics.stroke({ width: 2, color: 0xffffff });
    graphics.x = sx;
    graphics.y = sy;

    const label = new Text({ text: name, style: { fontSize: 10, fill: 0xffffff } });
    label.x = sx - label.width / 2;
    label.y = sy - TILE_SIZE - 12;

    app.stage.addChild(graphics);
    app.stage.addChild(label);

    entitiesRef.current.set(id, { graphics, label, targetWorldX: x, targetWorldZ: z });
  }

  function moveEntity(id: string, x: number, z: number) {
    const entity = entitiesRef.current.get(id);
    if (!entity || !appRef.current) return;
    appRef.current.stage.addChild(entity.graphics);
    appRef.current.stage.addChild(entity.label);
  }

  function removeEntity(id: string) {
    const entity = entitiesRef.current.get(id);
    if (!entity || !appRef.current) return;
    appRef.current.stage.removeChild(entity.graphics);
    appRef.current.stage.removeChild(entity.label);
    entity.graphics.destroy();
    entity.label.destroy();
    entitiesRef.current.delete(id);
  }

  const handleJoystickStart = useCallback((e: React.TouchEvent) => {
    if (!joystickBaseRef.current) return;
    const touch = e.touches[0];
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    joystickRef.current = {
      active: true,
      startX: centerX,
      startY: centerY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      dx: 0,
      dy: 0
    };
  }, []);

  const handleJoystickMove = useCallback((e: React.TouchEvent) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const js = joystickRef.current;
    
    js.currentX = touch.clientX;
    js.currentY = touch.clientY;
    
    const maxDist = 50;
    let dx = js.currentX - js.startX;
    let dy = js.currentY - js.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }
    
    js.dx = dx / maxDist;
    js.dy = dy / maxDist;
    
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, []);

  const handleJoystickEnd = useCallback(() => {
    joystickRef.current = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 };
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = "translate(0px, 0px)";
    }
  }, []);

  const handleAction = useCallback((action: string) => {
    if (clientRef.current?.connected) {
      clientRef.current.sendPlayerAction(action, {});
    }
  }, []);

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {!connected && !error && (
        <div style={{ position: "absolute", top: 16, left: 16, color: "#fff", fontFamily: "monospace", zIndex: 10 }}>
          Connecting...
        </div>
      )}
      {error && (
        <div style={{ position: "absolute", top: 16, left: 16, color: "#f55", fontFamily: "monospace", zIndex: 10 }}>
          Error: {error}
        </div>
      )}
      {connected && isMobile && (
        <div style={{ position: "absolute", top: 16, left: 16, color: "#5f5", fontFamily: "monospace", fontSize: 12, zIndex: 10 }}>
          ● Connected
        </div>
      )}
      
      {/* Mobile Joystick */}
      {showJoystick && (
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            border: "2px solid rgba(255,255,255,0.3)",
            touchAction: "none",
            zIndex: 100
          }}
        >
          <div
            ref={joystickKnobRef}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 50,
              height: 50,
              marginTop: -25,
              marginLeft: -25,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              transition: "transform 0.05s"
            }}
          />
        </div>
      )}
      
      {/* Mobile Action Buttons */}
      {showJoystick && connected && (
        <div style={{ position: "absolute", bottom: 40, right: 40, display: "flex", flexDirection: "column", gap: 10, zIndex: 100 }}>
          <button
            onTouchStart={() => handleAction("INTERACT")}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(100,200,100,0.6)",
              border: "2px solid rgba(255,255,255,0.5)",
              color: "#fff",
              fontSize: 14,
              fontWeight: "bold",
              touchAction: "none"
            }}
          >
            A
          </button>
          <button
            onTouchStart={() => handleAction("LOOK")}
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "rgba(100,100,200,0.6)",
              border: "2px solid rgba(255,255,255,0.5)",
              color: "#fff",
              fontSize: 12,
              fontWeight: "bold",
              touchAction: "none"
            }}
          >
            LOOK
          </button>
        </div>
      )}
      
      {/* Desktop hint */}
      {!isMobile && connected && (
        <div style={{ 
          position: "absolute", 
          bottom: 16, 
          left: "50%", 
          transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.4)", 
          fontFamily: "monospace", 
          fontSize: 12,
          zIndex: 10 
        }}>
          WASD or Arrow Keys to move
        </div>
      )}
    </div>
  );
}
