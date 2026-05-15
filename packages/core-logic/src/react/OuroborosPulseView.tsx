import { useMemo, useState, useEffect, type CSSProperties, type ReactElement } from "react";

export interface OuroborosPulseFrame {
  tick: number;
  worldHash: string;
  label?: string;
}

export interface OuroborosPulseViewProps {
  frames: OuroborosPulseFrame[];
  tickHz?: number;
  title?: string;
  subtitle?: string;
  onFrameSelect?: (frame: OuroborosPulseFrame) => void;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function useTenHzPulse(tickHz: number, selectedTick: number): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const loop = (time: number) => {
      setNow((time - start) / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);
  return clamp01((Math.sin(now * tickHz * Math.PI * 2 + selectedTick * 0.13) + 1) / 2);
}

export function OuroborosPulseView({
  frames,
  tickHz = 10,
  title = "Engine Online. Kausalität stabil.",
  subtitle = "10-Hz WorldHash heartbeat · Cyber-Zen Replay Bridge",
  onFrameSelect,
}: OuroborosPulseViewProps): ReactElement {
  const safeFrames = frames.length > 0 ? frames : [{ tick: 0, worldHash: "warming", label: "waiting" }];
  const [index, setIndex] = useState(safeFrames.length - 1);
  const active = safeFrames[Math.max(0, Math.min(index, safeFrames.length - 1))];
  const pulse = useTenHzPulse(tickHz, active.tick);
  const shortHash = useMemo(() => active.worldHash.slice(0, 16), [active.worldHash]);

  const style = {
    "--wasd-aura": "0, 229, 255",
    "--wasd-neon": "57, 255, 20",
    "--wasd-violet": "120, 90, 255",
    background: "linear-gradient(135deg, rgba(10,10,10,.95), rgba(4,15,22,.98))",
    border: "1px solid rgba(var(--wasd-aura), .38)",
    boxShadow: `0 0 ${24 + pulse * 34}px rgba(var(--wasd-aura), ${0.18 + pulse * 0.36})`,
  } as CSSProperties;

  const orbStyle = {
    transform: `scale(${1 + pulse * 0.06})`,
    boxShadow: `0 0 ${28 + pulse * 46}px rgba(var(--wasd-aura), ${0.32 + pulse * 0.42}), inset 0 0 32px rgba(var(--wasd-neon), ${0.08 + pulse * 0.18})`,
  } as CSSProperties;

  return (
    <section style={style} className="ouroboros-pulse-view rounded-3xl p-6 text-white">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/70">Ouroboros ARE SDK</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-2 max-w-xl text-sm text-cyan-100/70">{subtitle}</p>
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
            onChange={(event) => {
              const next = Number((event.target as HTMLInputElement).value);
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
