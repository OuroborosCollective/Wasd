/**
 * Quest Echo Tracker — Screen 10 style feed.
 * - O(1) head reads via PortalWorldHistory ring buffer
 * - ThemeEngine colours: combat → fire-glitch pulse, trade → marina calm
 */

import React, { useEffect, useMemo, useSyncExternalStore, useState } from "react";
import {
  getVisualState,
  pushLiveTickerHazard,
  subscribeVisualTheme,
  visualStateToCssVars,
  type VisualThemeState,
} from "@wasd/shared";
import { PortalWorldHistory, type WorldEcho } from "../world/PortalWorldHistory";

function echoVisual(echo: WorldEcho, live: VisualThemeState): VisualThemeState {
  if (echo.kind === "combat") {
    return getVisualState(Math.max(0.78, live.hazardIndex), Math.max(0.0005, live.aggressionTrend));
  }
  return getVisualState(0.18, 0);
}

const EchoTracker: React.FC = () => {
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);

  const echoes = useSyncExternalStore(
    (onChange) => hist.subscribe(onChange),
    () => hist.snapshotRecent(24),
    () => hist.snapshotRecent(24),
  );

  const [liveTheme, setLiveTheme] = useState<VisualThemeState>(() => getVisualState(0.2, 0));

  useEffect(() => {
    let last: VisualThemeState | null = null;
    return subscribeVisualTheme((v: VisualThemeState) => {
      setLiveTheme(v);
      const prev = last;
      last = v;

      const enteredFire = v.mode === "fire_glitch" && prev?.mode !== "fire_glitch";
      const hazardSpike = prev != null && v.hazardIndex - prev.hazardIndex > 0.12;
      if (enteredFire || hazardSpike) {
        hist.recordNpcCombatComplete(
          `Combat echo · hazard ${v.hazardIndex.toFixed(2)} · trend ${v.aggressionTrend.toFixed(4)}`,
        );
      }

      const calmMarina = v.mode === "marina" && v.hazardIndex < 0.32;
      const cooled = prev != null && prev.hazardIndex > 0.38 && v.hazardIndex < prev.hazardIndex - 0.08;
      if (calmMarina && cooled) {
        hist.recordNpcTradeComplete(`Trade echo · hazard eased to ${v.hazardIndex.toFixed(2)}`);
      }
    });
  }, [hist]);

  return (
    <div
      className="rounded-xl border border-slate-700 bg-slate-950/90 p-4 text-slate-100"
      style={visualStateToCssVars(liveTheme) as React.CSSProperties}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300">
          Quest Echo Tracker
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-cyan-500/40 bg-cyan-950/50 px-2 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-900/60"
            onClick={() => {
              pushLiveTickerHazard({ hazard_index: 0.2, aggression_trend: 0 });
              hist.recordNpcTradeComplete("NPC trade cleared (demo)");
            }}
          >
            + Trade echo
          </button>
          <button
            type="button"
            className="rounded border border-red-500/40 bg-red-950/40 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-900/50"
            onClick={() => {
              pushLiveTickerHazard({ hazard_index: 0.86, aggression_trend: 0.006 });
              hist.recordNpcCombatComplete("NPC combat resolved (demo)");
            }}
          >
            + Combat echo
          </button>
          <button
            type="button"
            className="rounded border border-amber-500/50 bg-amber-950/40 px-2 py-1 text-[11px] font-semibold text-amber-100 hover:bg-amber-900/50"
            onClick={() => {
              let i = 0;
              const step = () => {
                if (i >= 10) return;
                const h = Math.min(0.96, 0.74 + i * 0.022);
                pushLiveTickerHazard({
                  hazard_index: h,
                  aggression_trend: 0.004 + i * 0.0006,
                });
                hist.recordNpcCombatComplete(
                  `Stress chain #${i + 1}/10 · hazard ${h.toFixed(2)} · slot sync`,
                );
                i += 1;
                if (i < 10) window.setTimeout(step, 28);
              };
              step();
            }}
          >
            10× combat stress
          </button>
        </div>
      </div>

      <p className="mb-2 font-mono text-[10px] text-slate-500">
        O(1) head: <code>{hist.getHead()?.id ?? "—"}</code> · ring v{hist.getVersion()}
      </p>

      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {echoes.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
            Waiting for NPC trade / combat echoes…
          </li>
        ) : (
          echoes.map((echo) => {
            const vis = echoVisual(echo, liveTheme);
            const vars = visualStateToCssVars(vis);
            const isCombat = echo.kind === "combat";
            const firePulse = isCombat && vis.mode === "fire_glitch";

            return (
              <li
                key={echo.id}
                className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                  firePulse ? "border-red-500/50" : "border-cyan-500/30"
                }`}
                style={{
                  ...vars,
                  backgroundColor: "rgba(15,23,42,0.72)",
                  boxShadow: firePulse
                    ? `0 0 14px ${vis.auraHex}, inset 0 0 8px rgba(230,0,0,0.12)`
                    : `0 0 10px ${vis.auraHex}33`,
                  animation: firePulse
                    ? `echoFirePulse var(--wasd-phase-period, 0.9s) ease-in-out infinite`
                    : `echoMarinaPulse var(--wasd-phase-period, 1.4s) ease-in-out infinite`,
                }}
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: "var(--wasd-aura)",
                    boxShadow: `0 0 8px var(--wasd-aura)`,
                  }}
                />
                <div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">
                    {echo.kind} · {new Date(echo.ts).toLocaleTimeString()}
                  </div>
                  <div className="text-slate-100">{echo.summary}</div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <style>{`
        @keyframes echoFirePulse {
          0%, 100% { filter: brightness(1) hue-rotate(0deg); transform: translateX(0); }
          50% { filter: brightness(1.25) hue-rotate(-6deg); transform: translateX(0.5px); }
        }
        @keyframes echoMarinaPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }
      `}</style>
    </div>
  );
};

export default EchoTracker;
