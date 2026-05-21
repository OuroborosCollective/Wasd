import { useEffect, useRef, useState } from "react";
import { createClient } from "@wasd/core-network";
import { liveId, liveName, livePayload, liveSummary, liveX, liveZ, type LiveRealityEntity } from "./liveReality";

type LivePoint = {
  id: string;
  name: string;
  x: number;
  z: number;
  kind: "player" | "npc" | "loot";
};

type LiveRealityBridgeProps = {
  onFeed: (from: string, txt: string) => void;
  onConnected: (connected: boolean) => void;
};

function toPoint(entity: LiveRealityEntity, kind: LivePoint["kind"], index: number): LivePoint {
  return {
    id: `${kind}:${liveId(entity, `${kind}-${index}`)}`,
    name: liveName(entity, kind === "loot" ? "Loot" : kind === "npc" ? "NPC" : "Player"),
    x: liveX(entity),
    z: liveZ(entity),
    kind,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function screenPos(point: LivePoint, points: LivePoint[]) {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const minX = Math.min(...xs, -8);
  const maxX = Math.max(...xs, 8);
  const minZ = Math.min(...zs, -8);
  const maxZ = Math.max(...zs, 8);
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);
  return {
    left: `${clamp(((point.x - minX) / spanX) * 74 + 13, 8, 92)}%`,
    top: `${clamp(((point.z - minZ) / spanZ) * 58 + 22, 14, 84)}%`,
  };
}

export function LiveRealityBridge({ onFeed, onConnected }: LiveRealityBridgeProps) {
  const [points, setPoints] = useState<LivePoint[]>([]);
  const [tick, setTick] = useState<number | string>("?");
  const [warfront, setWarfront] = useState<string>("quiet");
  const [oracle, setOracle] = useState<string>("listening");
  const feedAt = useRef(0);
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    const client = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = client;

    function ingest(event: any, source: "heartbeat" | "world_tick") {
      const payload = livePayload(event);
      const summary = liveSummary(payload);
      const next = [
        ...summary.players.map((p, i) => toPoint(p, "player", i)),
        ...summary.npcs.map((p, i) => toPoint(p, "npc", i)),
        ...summary.loot.map((p, i) => toPoint(p, "loot", i)),
      ].slice(0, 160);

      if (next.length > 0) setPoints(next);
      setTick(payload.tick ?? payload.replay?.latestTick ?? payload.are?.shadow?.latestTick ?? "?");
      setWarfront(String(payload.warfront?.cycle?.phase ?? payload.warfront?.phase ?? "quiet"));
      const activeOracle = payload.oracle?.prophecies?.find?.((p: any) => p.active !== false);
      setOracle(String(activeOracle?.kind ?? payload.oracle?.prophecies?.[0]?.kind ?? "listening"));

      const now = Date.now();
      if (source === "world_tick" && now - feedAt.current > 5000) {
        feedAt.current = now;
        onFeed("LiveTick", `Tick ${payload.tick ?? "?"}: ${summary.players.length} players · ${summary.npcs.length} NPCs · ${summary.loot.length} loot`);
      }
    }

    client.on("connect" as any, () => { onConnected(true); onFeed("Net", "2D live reality bridge connected."); });
    client.on("disconnect" as any, () => onConnected(false));
    client.on("WORLD_HEARTBEAT" as any, (event: any) => ingest(event, "heartbeat"));
    client.on("world_tick" as any, (event: any) => ingest(event, "world_tick"));
    client.on("WORLD_TICK" as any, (event: any) => ingest(event, "world_tick"));
    client.connect();

    return () => client.disconnect();
  }, [onConnected, onFeed]);

  return (
    <section className="live-reality-bridge" aria-label="Live 2D Reality Bridge">
      <header>
        <b>LIVE REALITY</b>
        <span>tick {tick} · {warfront} · {oracle}</span>
      </header>
      <div className="live-reality-field">
        {points.map((point) => {
          const pos = screenPos(point, points);
          return (
            <span
              key={point.id}
              className={`live-dot ${point.kind}`}
              style={{ left: pos.left, top: pos.top }}
              title={`${point.kind}: ${point.name} (${Math.round(point.x)}, ${Math.round(point.z)})`}
            >
              <i />
              <small>{point.name.slice(0, 14)}</small>
            </span>
          );
        })}
      </div>
    </section>
  );
}
