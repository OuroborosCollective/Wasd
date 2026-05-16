import React, { useEffect, useMemo, useState } from "react";

export type OuroborosPulseFrame = {
  tick: number;
  worldHash: string;
  drift?: number;
  label?: string;
};

export interface OuroborosPulseViewProps {
  frames: OuroborosPulseFrame[];
  tickHz?: number;
  onFrameSelect?: (frame: OuroborosPulseFrame) => void;
}

type RangeInputEvent = {
  target: {
    value: string;
  };
};

function clampIndex(index: number, frames: OuroborosPulseFrame[]): number {
  if (frames.length === 0) return 0;
  return Math.min(Math.max(index, 0), frames.length - 1);
}

export function OuroborosPulseView({
  frames,
  tickHz = 10,
  onFrameSelect,
}: OuroborosPulseViewProps): React.ReactElement {
  const safeFrames = frames.length > 0
    ? frames
    : [{ tick: 0, worldHash: "genesis", drift: 0, label: "empty pulse" }];
  const [index, setIndex] = useState(0);
  const active = safeFrames[clampIndex(index, safeFrames)];

  useEffect(() => {
    setIndex((current) => clampIndex(current, safeFrames));
  }, [safeFrames.length]);

  const orbStyle = useMemo(() => {
    const drift = Math.abs(active.drift ?? 0);
    const scale = 1 + Math.min(0.18, drift / 1000);
    return {
      transform: `scale(${scale.toFixed(3)})`,
      boxShadow: `0 0 ${Math.round(20 + drift * 2)}px rgba(34, 211, 238, 0.35)`,
    };
  }, [active.drift]);

  const shortHash = active.worldHash.length > 18
    ? `${active.worldHash.slice(0, 9)}…${active.worldHash.slice(-6)}`
    : active.worldHash;

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/80 p-6 text-cyan-50 shadow-2xl shadow-cyan-950/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">Ouroboros Pulse</p>
          <h2 className="mt-2 text-2xl font-semibold text-cyan-50">Deterministic Worldhash Viewer</h2>
        </div>
        <div className="rounded-full border border-cyan-300/40 px-4 py-2 font-mono text-sm text-cyan-100">
          SYNC LCK {tickHz.toFixed(2)} Hz
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="grid place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-300/5 p-6">
          <div style={orbStyle} className="grid h-36 w-36 place-items-center rounded-full border border-cyan-200/60 bg-cyan-300/10 transition-transform duration-100">
            <span className="font-mono text-xs text-lime-100">tick {active.tick}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-300/20 bg-black/30 p-5">
          <div className="grid gap-3 font-mono text-xs text-cyan-100/80 md:grid-cols-3">
            <span>frame {index + 1}/{safeFrames.length}</span>
            <span>hash {shortHash}</span>
            <span>{active.label ?? "worldhash pulse"}</span>
          </div>
          <input
            className="mt-5 w-full accent-cyan-300"
            type="range"
            min={0}
            max={safeFrames.length - 1}
            value={index}
            onChange={(event: RangeInputEvent) => {
              const next = Number(event.target.value);
              setIndex(next);
              onFrameSelect?.(safeFrames[next]);
            }}
          />
          <pre className="mt-5 overflow-auto rounded-2xl border border-cyan-300/20 bg-black/50 p-4 font-mono text-[11px] leading-5 text-cyan-100/80">
{JSON.stringify(active, null, 2)}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default OuroborosPulseView;
