import React, { useEffect, useMemo, useState } from "react";
import {
  getVisualState,
  subscribeVisualTheme,
  visualStateToCssVars,
  type VisualThemeState,
} from "@wasd/shared";
import DestinyPathsPanel from "../community/DestinyPathsPanel";
import EchoTracker from "../community/EchoTracker";
import InventoryRefinementPanel from "../community/InventoryRefinementPanel";
import ScienceMascotChat from "./ScienceMascotChat";
import WarfrontCombatHud from "./WarfrontCombatHud";

export const SciencePortal: React.FC = () => {
  const [active, setActive] = useState(true);
  const [visual, setVisual] = useState<VisualThemeState>(() => getVisualState(0.15, 0));

  useEffect(() => {
    if (!active) return;
    return subscribeVisualTheme((v: VisualThemeState) => setVisual(v));
  }, [active]);

  const cssVars = useMemo(() => visualStateToCssVars(visual), [visual]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950 p-4 text-slate-100 shadow-[0_0_20px_rgba(0,229,255,0.2)]"
      style={cssVars as React.CSSProperties}
    >
      <div className="relative z-10 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,420px)] lg:items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-white" style={{ textShadow: `0 0 12px var(--wasd-aura)` }}>
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
            Live cockpit for theme state, echo history, refinement, and destiny paths.
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

          <WarfrontCombatHud visual={visual} active={active} />
          <EchoTracker />
          <InventoryRefinementPanel />
          <DestinyPathsPanel />
        </div>

        <div className="lg:sticky lg:top-2">
          <ScienceMascotChat visual={visual} active={active} />
        </div>
      </div>
    </div>
  );
};

export default SciencePortal;
