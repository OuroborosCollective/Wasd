import React, { useMemo } from "react";
import type { CSSProperties } from "react";
import type { VisualThemeState } from "@wasd/shared";
import { cyberZenTemplateCssVars, selectCyberZenTemplate } from "./cyberzenStitch";

interface Props {
  visual: VisualThemeState;
}

interface HexRow {
  address: string;
  left: string;
  mid: string;
  right: string;
  raw: string;
}

const HEX_ROW_COUNT = 6;
const HEX_CELLS_PER_ROW = 8;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function safeHz(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

function fnv1a32(seed: string): number {
  let h = 2166136261;

  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  return h >>> 0;
}

function nextHash(hash: number, salt: number): number {
  let h = hash >>> 0;
  h ^= salt >>> 0;
  h = Math.imul(h, 16777619) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 2246822507) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function buildHexRows(seed: string): HexRow[] {
  let h = fnv1a32(seed);

  return Array.from({ length: HEX_ROW_COUNT }, (_, row) => {
    const address = `0x${(row * 16).toString(16).padStart(4, "0")}`;

    const cells = Array.from({ length: HEX_CELLS_PER_ROW }, (_, col) => {
      h = nextHash(h, row * 31 + col * 17 + seed.length * 101);
      return (h & 0xff).toString(16).padStart(2, "0").toUpperCase();
    });

    return {
      address,
      left: cells.slice(0, 3).join(" "),
      mid: cells.slice(3, 6).join(" "),
      right: cells.slice(6).join(" "),
      raw: `${address}:${cells.join("")}`,
    };
  });
}

export const CyberZenStitchPanel: React.FC<Props> = ({ visual }) => {
  const template = useMemo(() => selectCyberZenTemplate(visual), [visual]);

  const rows = useMemo(
    () =>
      buildHexRows(
        [
          template.id,
          visual.mode,
          visual.auraHex,
          visual.phaseShiftPulseHz,
          visual.hazardIndex,
        ].join("|"),
      ),
    [
      template.id,
      visual.mode,
      visual.auraHex,
      visual.phaseShiftPulseHz,
      visual.hazardIndex,
    ],
  );

  const cssVars = useMemo(
    () => cyberZenTemplateCssVars(template),
    [template],
  );

  const hazard = clamp01(visual.hazardIndex);
  const hazardWidth = Math.round(18 + hazard * 72);
  const active = visual.mode !== "marina" && visual.mode !== "balanced";

  const panelStyle = {
    ...cssVars,
    borderColor: "var(--stitch-a)",
  } satisfies CSSProperties;

  return (
    <section
      className="relative overflow-hidden rounded-xl border bg-black/35 p-4 text-slate-100 shadow-[0_0_22px_rgba(0,229,255,0.14)]"
      style={panelStyle}
      aria-label={`Cyber Zen Stitch Panel ${template.title}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.06)_1px,transparent_1px)] bg-[size:22px_22px]" />
        <div className="absolute -right-24 top-8 h-64 w-64 rounded-full border border-[var(--stitch-a)] shadow-[0_0_42px_var(--stitch-a)]" />
        <div className="absolute -right-10 top-24 h-36 w-36 rounded-full border border-[var(--stitch-c)] shadow-[0_0_28px_var(--stitch-c)]" />
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--stitch-a)]">
                STITCH_TEMPLATE
              </div>

              <h3 className="mt-1 text-lg font-black uppercase tracking-wide text-white">
                {template.title}
              </h3>
            </div>

            <span
              className="rounded border border-[var(--stitch-a)] px-2 py-1 font-mono text-[10px] uppercase text-[var(--stitch-a)]"
              title={active ? "Cyber Zen stitch runtime active" : "Cyber Zen stitch synced but idle"}
            >
              {active ? "AI_ACTIVE" : "SYNC_IDLE"}
            </span>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/45 p-3 font-mono text-xs text-slate-300">
            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              <span>CHAIN_STRING_HASH_VALIDATOR</span>
              <span style={{ color: "var(--stitch-b)" }}>10-Hz</span>
            </div>

            <div aria-label="Deterministic hash rows">
              {rows.map((row) => (
                <div key={row.raw} className="leading-6">
                  <span>{row.address}:</span>{" "}
                  <span className="text-slate-500">{row.left}</span>{" "}
                  <span style={{ color: "var(--stitch-a)" }}>{row.mid}</span>{" "}
                  <span style={{ color: "var(--stitch-b)" }}>{row.right}</span>
                </div>
              ))}
            </div>

            <div
              className="mt-3 h-1 overflow-hidden rounded bg-white/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hazardWidth}
              aria-label="Cyber Zen hazard resonance"
            >
              <div
                className="h-full rounded transition-[width] duration-300"
                style={{
                  width: `${hazardWidth}%`,
                  background:
                    "linear-gradient(90deg, var(--stitch-a), var(--stitch-b), var(--stitch-c))",
                  boxShadow: "0 0 14px var(--stitch-a)",
                }}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
            <div className="rounded border border-white/10 bg-black/30 p-2">
              <div className="text-slate-500">role</div>
              <div className="truncate" title={template.role}>
                {template.role}
              </div>
            </div>

            <div className="rounded border border-white/10 bg-black/30 p-2">
              <div className="text-slate-500">mode</div>
              <div className="truncate" title={visual.mode}>
                {visual.mode}
              </div>
            </div>

            <div className="rounded border border-white/10 bg-black/30 p-2">
              <div className="text-slate-500">pulse</div>
              <div>{safeHz(visual.phaseShiftPulseHz)} Hz</div>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="mx-auto mb-3 grid h-36 w-36 place-items-center rounded-full border border-[var(--stitch-a)] bg-black/40 shadow-[0_0_30px_var(--stitch-a)]">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-[var(--stitch-c)] shadow-[0_0_24px_var(--stitch-c)]">
              <div className="h-10 w-10 rounded-full border-4 border-[var(--stitch-b)] shadow-[0_0_18px_var(--stitch-b)]" />
            </div>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            runtime_use
          </div>

          <p className="mt-1 text-xs text-slate-200">
            {template.runtimeUse}
          </p>

          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
            source
          </div>

          <p className="mt-1 text-xs text-slate-300">
            {template.sourceScreens.join(" · ")}
          </p>
        </aside>
      </div>
    </section>
  );
};

export default CyberZenStitchPanel;
