import React, { useEffect, useMemo, useRef, useState } from "react";
import type { VisualThemeState } from "@wasd/shared";
import { pushLiveTickerHazard } from "@wasd/shared";
import { PortalWorldHistory } from "../world/PortalWorldHistory";
import { PortalNPCChatBridge } from "../world/PortalNPCChatBridge";

export interface WarfrontFeedEntry {
  seq: number;
  tick: number;
  kind: "hit" | "kill";
  attackerId: string;
  defenderId: string;
  damage: number;
  summary: string;
}

export interface WarfrontHudAgent {
  id: string;
  name: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  aggression: number;
  side: "warfront" | "dummy" | "player";
}

export interface WarfrontHudSnapshot {
  tick: number;
  originX: number;
  originY: number;
  agents: WarfrontHudAgent[];
  lastEventSummary: string | null;
}

export interface WarfrontCombatHudProps {
  visual: VisualThemeState;
  active: boolean;
}

const RADAR = 56;

const WarfrontCombatHud: React.FC<WarfrontCombatHudProps> = ({ visual, active }) => {
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);
  const sinceSeq = useRef(0);
  const seen = useRef(new Set<number>());
  const [hud, setHud] = useState<WarfrontHudSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const base = (import.meta.env.VITE_WASD_API_BASE ?? "").replace(/\/$/, "");

  useEffect(() => {
    if (!active || !base) {
      setErr(base ? null : "offline");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`${base}/api/v1/warfront/feed?since=${sinceSeq.current}`, {
          cache: "no-store",
        });
        const j = (await r.json()) as {
          events?: WarfrontFeedEntry[];
          lastSeq?: number;
          hud?: WarfrontHudSnapshot;
        };
        if (!r.ok || cancelled) return;
        if (j.hud) setHud(j.hud);
        const evs = j.events ?? [];
        for (const ev of evs) {
          if (seen.current.has(ev.seq)) continue;
          seen.current.add(ev.seq);
          hist.recordNpcCombatComplete(ev.summary);

          const isCrit = ev.summary.toLowerCase().includes("crit") || ev.damage >= 35;
          if (isCrit) {
            PortalNPCChatBridge.getInstance().receiveCriticalHit(ev.damage);
          }

          if (ev.kind === "kill") {
            pushLiveTickerHazard({
              hazard_index: Math.min(0.95, 0.7 + ev.damage * 0.004),
              aggression_trend: 0.005,
            });
          } else {
            pushLiveTickerHazard({
              hazard_index: Math.min(0.78, 0.45 + ev.damage * 0.0025),
              aggression_trend: 0.0015,
            });
          }
        }
        if (typeof j.lastSeq === "number") sinceSeq.current = j.lastSeq;
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "fetch");
      }
    };
    const id = window.setInterval(() => void poll(), 220);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, base, hist]);

  const fire = visual.mode === "fire_glitch";

  const dots = useMemo(() => {
    if (!hud?.agents?.length) return [];
    const ox = hud.originX;
    const oy = hud.originY;
    const out: Array<{ key: string; left: string; top: string; label: string; side: string }> = [];
    for (const a of hud.agents) {
      if (a.side === "dummy") continue;
      const dx = a.x - ox;
      const dy = a.y - oy;
      const dist = Math.hypot(dx, dy) || 0.001;
      const t = Math.min(1, dist / 28);
      const ang = Math.atan2(dy, dx);
      const r = t * (RADAR * 0.42);
      const px = RADAR / 2 + Math.cos(ang) * r;
      const py = RADAR / 2 + Math.sin(ang) * r;
      out.push({
        key: a.id,
        left: `${px}px`,
        top: `${py}px`,
        label: a.name.slice(0, 3),
        side: a.side,
      });
    }
    return out;
  }, [hud]);

  return (
    <div
      className="rounded-xl border p-3 text-slate-100"
      style={{
        borderColor: "color-mix(in srgb, var(--wasd-aura) 38%, transparent)",
        background: "linear-gradient(160deg, rgba(2,6,23,0.92) 0%, rgba(15,23,42,0.75) 100%)",
        boxShadow: `0 0 18px color-mix(in srgb, var(--wasd-aura) 22%, transparent)`,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--wasd-aura)" }}>
          Warfront · Live
        </div>
        <div className="font-mono text-[10px] text-slate-500">tick {hud?.tick ?? "—"}</div>
      </div>

      <div className="flex items-center gap-4">
        {/* Crosshair (Screen 1) */}
        <div
          className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: "color-mix(in srgb, var(--wasd-aura) 45%, transparent)",
            boxShadow: fire ? `inset 0 0 12px rgba(230,0,0,0.25)` : `inset 0 0 10px color-mix(in srgb, var(--wasd-aura) 15%, transparent)`,
          }}
        >
          <div
            className="absolute h-8 w-px"
            style={{ backgroundColor: "var(--wasd-aura)", opacity: 0.85 }}
          />
          <div
            className="absolute h-px w-8"
            style={{ backgroundColor: "var(--wasd-aura)", opacity: 0.85 }}
          />
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: "var(--wasd-aura)",
              boxShadow: `0 0 10px var(--wasd-aura)`,
            }}
          />
        </div>

        {/* Threat radar (Screen 6) */}
        <div
          className="relative shrink-0 rounded-full border"
          style={{
            width: RADAR,
            height: RADAR,
            borderColor: "color-mix(in srgb, var(--wasd-aura) 30%, transparent)",
            background: "radial-gradient(circle, rgba(15,23,42,0.4) 0%, rgba(2,6,23,0.85) 70%)",
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed opacity-40"
            style={{ borderColor: "var(--wasd-aura)" }}
          />
          {dots.map((d) => (
            <div
              key={d.key}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: d.left,
                top: d.top,
                backgroundColor: d.side === "warfront" ? "#f87171" : "#38bdf8",
                boxShadow: `0 0 6px ${d.side === "warfront" ? "#ef4444" : "#0ea5e9"}`,
              }}
              title={d.label}
            />
          ))}
          <div
            className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300"
            style={{ boxShadow: "0 0 6px #22d3ee" }}
          />
        </div>

        <div className="min-w-0 flex-1 font-mono text-[10px] leading-snug text-slate-400">
          {err === "offline" && <span>API base unset — HUD idle (warfront still simulates on server).</span>}
          {err && err !== "offline" && <span className="text-amber-400">Feed: {err}</span>}
          {!err && hud?.lastEventSummary && (
            <span className="text-slate-300">{hud.lastEventSummary}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarfrontCombatHud;
