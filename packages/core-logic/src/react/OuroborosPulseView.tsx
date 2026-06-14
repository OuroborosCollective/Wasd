import React, { useCallback, useEffect, useMemo, useState } from "react";

export type OuroborosPulseFrame = {
  tick: number;
  worldHash?: string;
  drift?: number;
  label?: string;
};

export interface OuroborosPulseViewProps {
  frames?: OuroborosPulseFrame[];
  tickHz?: number;
  onFrameSelect?: (frame: OuroborosPulseFrame) => void;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function clampIndex(index: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return clampNumber(Math.trunc(index), 0, frameCount - 1);
}

function normalizeTickHz(tickHz: number | undefined): number {
  if (!Number.isFinite(tickHz) || !tickHz || tickHz <= 0) return 10;
  return tickHz;
}

function readWorldHash(frame: OuroborosPulseFrame | null): string | null {
  if (!frame) return null;
  if (typeof frame.worldHash !== "string") return null;
  if (frame.worldHash.trim().length === 0) return null;
  return frame.worldHash;
}

function shortenHash(hash: string | null): string {
  if (!hash) return "INVALID_WORLD_HASH";
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 9)}…${hash.slice(-6)}`;
}

export function OuroborosPulseView({
  frames,
  tickHz = 10,
  onFrameSelect,
}: OuroborosPulseViewProps): React.ReactElement {
  const sourceFrames = Array.isArray(frames) ? frames : [];

  const [index, setIndex] = useState(0);

  const frameCount = sourceFrames.length;
  const hasFrames = frameCount > 0;
  const maxIndex = Math.max(0, frameCount - 1);
  const activeIndex = clampIndex(index, frameCount);
  const active = hasFrames ? sourceFrames[activeIndex] ?? null : null;
  const safeTickHz = normalizeTickHz(tickHz);
  const activeHash = readWorldHash(active);

  useEffect(() => {
    setIndex((current) => clampIndex(current, frameCount));
  }, [frameCount]);

  const drift = useMemo(() => {
    if (!active) return 0;

    const raw = active.drift ?? 0;
    return Number.isFinite(raw) ? Math.abs(raw) : 0;
  }, [active]);

  const orbStyle = useMemo<React.CSSProperties>(() => {
    const scale = 1 + Math.min(0.18, drift / 1000);
    const glow = Math.round(20 + drift * 2);

    return {
      transform: `scale(${scale.toFixed(3)})`,
      boxShadow: `0 0 ${glow}px rgba(34, 211, 238, 0.35)`,
    };
  }, [drift]);

  const shortHash = shortenHash(activeHash);
  const activeLabel = active?.label ?? "worldhash pulse";

  const selectFrame = useCallback(
    (nextIndex: number) => {
      if (!hasFrames) return;

      const clamped = clampIndex(nextIndex, frameCount);
      const nextFrame = sourceFrames[clamped];

      setIndex(clamped);

      if (nextFrame) {
        onFrameSelect?.(nextFrame);
      }
    },
    [sourceFrames, frameCount, hasFrames, onFrameSelect],
  );

  return (
    <section className="rounded-3xl border border-cyan-300/20 bg-slate-950/80 p-6 text-cyan-50 shadow-2xl shadow-cyan-950/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Ouroboros Pulse
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-cyan-50">
            Deterministic Worldhash Viewer
          </h2>
        </div>

        <div className="rounded-full border border-cyan-300/40 px-4 py-2 font-mono text-sm text-cyan-100">
          SYNC LCK {safeTickHz.toFixed(2)} Hz
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="grid place-items-center rounded-3xl border border-cyan-300/20 bg-cyan-300/5 p-6">
          <div
            style={orbStyle}
            className="grid h-36 w-36 place-items-center rounded-full border border-cyan-200/60 bg-cyan-300/10 transition-transform duration-100"
            aria-label={
              active
                ? `Active tick ${Number.isFinite(active.tick) ? active.tick : "invalid"}`
                : "No pulse frame available"
            }
          >
            <span className="font-mono text-xs text-lime-100">
              {active
                ? `tick ${Number.isFinite(active.tick) ? active.tick : "invalid"}`
                : "no frame"}
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-300/20 bg-black/30 p-5">
          <div className="grid gap-3 font-mono text-xs text-cyan-100/80 md:grid-cols-3">
            <span>
              frame {hasFrames ? activeIndex + 1 : 0}/{frameCount}
            </span>

            <span>hash {shortHash}</span>

            <span>
              {hasFrames
                ? activeHash
                  ? activeLabel
                  : "INVALID FRAME: MISSING WORLDHASH"
                : "NO PULSE FRAMES"}
            </span>
          </div>

          <input
            className="mt-5 w-full accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            type="range"
            min={0}
            max={maxIndex}
            value={activeIndex}
            disabled={!hasFrames}
            aria-label="Select deterministic pulse frame"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              selectFrame(Number(event.target.value));
            }}
          />

          <pre className="mt-5 overflow-auto rounded-2xl border border-cyan-300/20 bg-black/50 p-4 font-mono text-[11px] leading-5 text-cyan-100/80">
            {active
              ? JSON.stringify(
                  {
                    ...active,
                    worldHash: activeHash ?? "INVALID_WORLD_HASH",
                  },
                  null,
                  2,
                )
              : JSON.stringify(
                  {
                    status: "NO_PULSE_FRAMES",
                    truthPath: "empty",
                    note: "No synthetic genesis frame generated.",
                  },
                  null,
                  2,
                )}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default OuroborosPulseView;
