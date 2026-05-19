/**
 * Server-side theme hazard / ARE-event bridge — behavior must stay aligned with
 * `packages/shared/src/theme/ThemeEngine.ts` (portal / GlobalLiveTicker use that file).
 *
 * Duplicated here because server `tsc` uses `rootDir: ./src` and cannot compile sources
 * outside `server/src` without project-reference churn.
 */

import { EventEmitter } from "node:events";

export const THEME_MARINA_AURA = "#00E5FF";
export const THEME_ORGANIC_FIRE = "#E60000";
export const THEME_LEGENDARY_LOOT = "#FFD76A";
export const THEME_ORACLE_GOLD = "#FFE66D";
export const THEME_GOVERNANCE_VIOLET = "#8B5CF6";
export const THEME_REPAIR_GREEN = "#39FF14";
export const THEME_OBSERVATION_VIOLET = "#3B2CFF";

export type ThemeAuraMode =
  | "marina"
  | "balanced"
  | "fire_glitch"
  | "loot_legendary"
  | "oracle_gold"
  | "governance_sovereign"
  | "repair_surgery"
  | "observation_past"
  | "identity_cyan";

export interface VisualThemeState {
  auraHex: string;
  secondaryHex: string;
  mode: ThemeAuraMode;
  glitchIntensity: number;
  phaseShiftPulseHz: number;
  hazardIndex: number;
  aggressionTrend: number;
}

export type AREThemeEventKind = "tick" | "oracle" | "governance" | "repair" | "violation" | "observation" | "identity";
export interface AREThemeEventPayload {
  kind: AREThemeEventKind;
  tick?: number;
  active?: boolean;
  severity?: number;
  phase?: number;
  hash?: string;
  label?: string;
}

const BASE_PHASE_PULSE_HZ = 0.85;
const TREND_GAIN = 220;

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpHex(a: string, b: string, t: number): string {
  const u = clamp01(t);
  const A = parseHex(a);
  const B = parseHex(b);
  const r = Math.round(A.r + (B.r - A.r) * u);
  const g = Math.round(A.g + (B.g - A.g) * u);
  const bCh = Math.round(A.b + (B.b - A.b) * u);
  return `#${[r, g, bCh].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function stableUnit(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 10000) / 10000;
}

function deterministicPhase(tick: number | undefined, hash = ""): number {
  const base = Number.isFinite(tick ?? Number.NaN) ? Number(tick) : 0;
  return stableUnit(`${base}|${hash}|ARE_THEME_PHASE`);
}

export function getVisualState(hazardIndex: number, aggressionTrend: number): VisualThemeState {
  const h = clamp01(Number.isFinite(hazardIndex) ? hazardIndex : 0);
  const trend = Number.isFinite(aggressionTrend) ? aggressionTrend : 0;

  let auraHex = THEME_MARINA_AURA;
  let secondaryHex = "#0a1628";
  let mode: ThemeAuraMode = "marina";
  let glitchIntensity = 0;

  if (h < 0.3) {
    auraHex = THEME_MARINA_AURA;
    secondaryHex = "#003844";
    mode = "marina";
    glitchIntensity = 0;
  } else if (h > 0.7) {
    auraHex = THEME_ORGANIC_FIRE;
    secondaryHex = lerpHex("#2a0000", THEME_ORGANIC_FIRE, 0.55);
    mode = "fire_glitch";
    glitchIntensity = clamp01((h - 0.7) / 0.3);
  } else {
    const t = (h - 0.3) / 0.4;
    auraHex = lerpHex(THEME_MARINA_AURA, THEME_ORGANIC_FIRE, t);
    secondaryHex = lerpHex("#003844", "#3d0808", t);
    mode = "balanced";
    glitchIntensity = t * 0.55;
  }

  const trendBoost =
    trend > 0 ? Math.min(4.2, 1 + trend * TREND_GAIN) : Math.max(0.45, 1 + Math.min(0, trend) * 40);
  const phaseShiftPulseHz = BASE_PHASE_PULSE_HZ * trendBoost;

  return { auraHex, secondaryHex, mode, glitchIntensity, phaseShiftPulseHz, hazardIndex: h, aggressionTrend: trend };
}

export function getAREEventVisualState(payload: AREThemeEventPayload): VisualThemeState {
  const severity = clamp01(Number.isFinite(payload.severity ?? Number.NaN) ? Number(payload.severity) : payload.active ? 0.72 : 0.18);
  const phase = Number.isFinite(payload.phase ?? Number.NaN) ? clamp01(Number(payload.phase)) : deterministicPhase(payload.tick, payload.hash ?? payload.label ?? payload.kind);
  const pulse = 1.0 + phase * 1.25 + severity * 0.9;

  if (payload.kind === "violation") return { auraHex: THEME_ORGANIC_FIRE, secondaryHex: "#39FF14", mode: "fire_glitch", glitchIntensity: 1, phaseShiftPulseHz: 4.2, hazardIndex: 1, aggressionTrend: 0.012 };
  if (payload.kind === "repair") return { auraHex: lerpHex("#5a0000", THEME_REPAIR_GREEN, 0.42 + phase * 0.16), secondaryHex: THEME_ORGANIC_FIRE, mode: "repair_surgery", glitchIntensity: 0.52 + severity * 0.32, phaseShiftPulseHz: pulse + 0.65, hazardIndex: 0.62 + severity * 0.26, aggressionTrend: 0.004 };
  if (payload.kind === "oracle") return { auraHex: lerpHex(THEME_MARINA_AURA, THEME_ORACLE_GOLD, 0.72 + phase * 0.16), secondaryHex: "#3f2f05", mode: "oracle_gold", glitchIntensity: 0.18 + severity * 0.22, phaseShiftPulseHz: pulse, hazardIndex: 0.22 + severity * 0.18, aggressionTrend: 0.001 };
  if (payload.kind === "governance") return { auraHex: lerpHex("#C0C0C0", THEME_GOVERNANCE_VIOLET, 0.42 + phase * 0.28), secondaryHex: "#E5E7EB", mode: "governance_sovereign", glitchIntensity: 0.12 + severity * 0.18, phaseShiftPulseHz: pulse * 0.72, hazardIndex: 0.18 + severity * 0.22, aggressionTrend: 0.0005 };
  if (payload.kind === "observation") return { auraHex: lerpHex(THEME_MARINA_AURA, THEME_OBSERVATION_VIOLET, 0.66 + phase * 0.22), secondaryHex: "#120a3d", mode: "observation_past", glitchIntensity: 0.18, phaseShiftPulseHz: 0.62 + phase * 0.32, hazardIndex: 0.12, aggressionTrend: -0.002 };
  if (payload.kind === "identity") return { auraHex: lerpHex("#39FF14", THEME_MARINA_AURA, 0.62 + phase * 0.22), secondaryHex: "#032f35", mode: "identity_cyan", glitchIntensity: 0.08 + severity * 0.08, phaseShiftPulseHz: 1.6 + phase, hazardIndex: 0.08 + severity * 0.08, aggressionTrend: 0 };

  return { auraHex: THEME_MARINA_AURA, secondaryHex: lerpHex("#003844", "#0a1628", phase), mode: "marina", glitchIntensity: 0.04 + phase * 0.08, phaseShiftPulseHz: 0.95 + phase * 0.32, hazardIndex: 0.08 + phase * 0.04, aggressionTrend: 0 };
}

export const THEME_HAZARD_EVENT = "wasd:theme_hazard";
export const THEME_ARE_EVENT = "wasd:are_event";

export type LiveTickerHazardPayload = {
  hazardIndex?: number;
  hazard_index?: number;
  aggressionTrend?: number;
  aggression_trend?: number;
  aggressionAvg?: number;
  aggression_avg?: number;
  resourceId?: string;
  scarcityScore?: number;
  trend?: string;
  predictedShift?: number;
};

let lastDedupeKey = "";
let lastVisual: VisualThemeState | null = null;
const themeEmitter = new EventEmitter();

function normalizeHazardPayload(p: LiveTickerHazardPayload): { hi: number; at: number } {
  const hi = p.hazardIndex ?? p.hazard_index ?? 0;
  const at = p.aggressionTrend ?? p.aggression_trend ?? 0;
  return { hi: clamp01(hi), at };
}

export function pushLiveTickerHazard(payload: LiveTickerHazardPayload): VisualThemeState {
  const { hi, at } = normalizeHazardPayload(payload);
  const key = `${hi.toFixed(3)}|${at.toFixed(5)}`;
  if (key === lastDedupeKey && lastVisual) return lastVisual;
  lastDedupeKey = key;
  const visual = getVisualState(hi, at);
  lastVisual = visual;
  themeEmitter.emit(THEME_HAZARD_EVENT, { visual, payload });
  themeEmitter.emit("theme_updated", visual);
  return visual;
}

export function pushAREEventTheme(payload: AREThemeEventPayload): VisualThemeState {
  const visual = getAREEventVisualState(payload);
  const key = `are|${payload.kind}|${payload.tick ?? ""}|${payload.active ?? ""}|${payload.severity ?? ""}|${payload.hash ?? ""}|${payload.label ?? ""}`;
  if (key === lastDedupeKey && lastVisual) return lastVisual;
  lastDedupeKey = key;
  lastVisual = visual;
  themeEmitter.emit(THEME_ARE_EVENT, { visual, payload });
  themeEmitter.emit("theme_updated", visual);
  return visual;
}

export function subscribeLiveTickerTheme(fn: (detail: { visual: VisualThemeState; payload: LiveTickerHazardPayload }) => void): () => void {
  themeEmitter.on(THEME_HAZARD_EVENT, fn);
  return () => themeEmitter.off(THEME_HAZARD_EVENT, fn);
}

export function subscribeAREEventTheme(fn: (detail: { visual: VisualThemeState; payload: AREThemeEventPayload }) => void): () => void {
  themeEmitter.on(THEME_ARE_EVENT, fn);
  return () => themeEmitter.off(THEME_ARE_EVENT, fn);
}

export function subscribeVisualTheme(fn: (visual: VisualThemeState) => void): () => void {
  themeEmitter.on("theme_updated", fn);
  return () => themeEmitter.off("theme_updated", fn);
}

export function getLastVisualTheme(): VisualThemeState | null {
  return lastVisual;
}
