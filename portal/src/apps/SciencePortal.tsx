import React, { useEffect, useMemo, useState } from "react";
import {
  getVisualState,
  subscribeVisualTheme,
  visualStateToCssVars,
  type VisualThemeState,
} from "@wasd/shared";
import EchoTracker from "../community/EchoTracker";
import ScienceMascotChat from "./ScienceMascotChat";

/**
 * Science Portal hub — reacts to NPC-driven hazard telemetry via ThemeEngine.
 * Listens to `theme_updated` (fed by GlobalLiveTicker / server live_ticker_hazard → pushLiveTickerHazard).
 */
export const SciencePortal: React.FC = () => {
  const [active, setActive] = useState(true);
  const [visual, setVisual] = useState<VisualThemeState>(() => getVisualState(0.15, 0));

  useEffect(() => {
    if (!active) return;
    return subscribeVisualTheme((v: VisualThemeState) => setVisual(v));
  }, [active]);

  const cssVars = useMemo(() => visualStateToCssVars(visual), [visual]);

  const isFire = visual.mode === "fire_glitch";

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-colors duration-300 ${
        isFire ? "border-red-500/60 shadow-[0_0_24px_rgba(230,0,0,0.35)]" : "border-cyan-500/40 shadow-[0_0_20px_rgba(0,229,255,0.2)]"
      }`}
      style={
        {
          ...cssVars,
          background:
            visual.mode === "marina"
              ? "linear-gradient(145deg, #0f172a 0%, #0c4a6e 55%, #0f172a 100%)"
              : visual.mode === "fire_glitch"
                ? "linear-gradient(145deg, #1a0505 0%, #450a0a 50%, #0f172a 100%)"
                : "linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 20%, var(--wasd-aura), transparent 55%)`,
          animation: `wasdPhasePulse var(--wasd-phase-period, 1.2s) ease-in-out infinite`,
        }}
      />
      <style>{`
        @keyframes wasdPhasePulse {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.02); }
        }
        @keyframes wasdGlitch {
          0%, 100% { transform: translateX(0); filter: hue-rotate(0deg); }
          25% { transform: translateX(-1px); filter: hue-rotate(-4deg); }
          75% { transform: translateX(1px); filter: hue-rotate(4deg); }
        }
      `}</style>

      <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3
              className={`text-xl font-bold text-white ${isFire ? "animate-[wasdGlitch_0.35s_ease-in-out_infinite]" : ""}`}
              style={{ textShadow: `0 0 12px var(--wasd-aura)` }}
            >
              Science Portal
            </h3>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className="rounded px-3 py-1 text-xs font-semibold text-slate-900"
              style={{ backgroundColor: "var(--wasd-aura)", boxShadow: "0 0 12px var(--wasd-aura)" }}
            >
              {active ? "Pause sync" : "Resume sync"}
            </button>
          </div>

          <p className="text-sm text-slate-200">
            Dashboard physisch gekoppelt an NPC-Aggression & Hazard-Index via{" "}
            <code className="rounded bg-black/30 px-1">@wasd/shared</code> ThemeEngine.
          </p>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs text-slate-100">
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-slate-400">hazard_index</div>
              <div className="text-lg font-bold" style={{ color: "var(--wasd-aura)" }}>
                {visual.hazardIndex.toFixed(3)}
              </div>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-slate-400">aggression_trend</div>
              <div className="text-lg font-bold">{visual.aggressionTrend.toFixed(5)}</div>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-slate-400">phase pulse</div>
              <div>{visual.phaseShiftPulseHz.toFixed(2)} Hz</div>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-slate-400">mode</div>
              <div className="uppercase">{visual.mode}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className="h-3 w-3 rounded-full border border-white/30"
              style={{ backgroundColor: "var(--wasd-aura)", boxShadow: `0 0 10px var(--wasd-aura)` }}
            />
            Aura <code>{visual.auraHex}</code>
            {isFire && <span className="text-red-400"> · glitch {visual.glitchIntensity.toFixed(2)}</span>}
          </div>

          <EchoTracker />
        </div>

        <div className="lg:sticky lg:top-2">
          <ScienceMascotChat visual={visual} active={active} />
        </div>
      </div>
    </div>
  );
};

export default SciencePortal;
