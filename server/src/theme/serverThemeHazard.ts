/**
 * Server-side theme hazard bridge — behavior must stay aligned with
 * `packages/shared/src/theme/ThemeEngine.ts` (portal / GlobalLiveTicker use that file).
 *
 * Duplicated here because server `tsc` uses `rootDir: ./src` and cannot compile sources
 * outside `server/src` without project-reference churn.
 */

import { EventEmitter } from "node:events";

export const THEME_MARINA_AURA = "#00E5FF";
export const THEME_ORGANIC_FIRE = "#E60000";

export type ThemeAuraMode = "marina" | "balanced" | "fire_glitch" | "loot_legendary";

export interface VisualThemeState {
  auraHex: string;
  secondaryHex: string;
  mode: ThemeAuraMode;
  glitchIntensity: number;
  phaseShiftPulseHz: number;
  hazardIndex: number;
  aggressionTrend: number;
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

  return {
    auraHex,
    secondaryHex,
    mode,
    glitchIntensity,
    phaseShiftPulseHz,
    hazardIndex: h,
    aggressionTrend: trend,
  };
}

export const THEME_HAZARD_EVENT = "wasd:theme_hazard";

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
  if (key === lastDedupeKey && lastVisual) {
    return lastVisual;
  }
  lastDedupeKey = key;
  const visual = getVisualState(hi, at);
  lastVisual = visual;
  themeEmitter.emit(THEME_HAZARD_EVENT, { visual, payload });
  themeEmitter.emit("theme_updated", visual);
  return visual;
}

export function subscribeLiveTickerTheme(
  fn: (detail: { visual: VisualThemeState; payload: LiveTickerHazardPayload }) => void,
): () => void {
  themeEmitter.on(THEME_HAZARD_EVENT, fn);
  return () => {
    themeEmitter.off(THEME_HAZARD_EVENT, fn);
  };
}

export function subscribeVisualTheme(fn: (visual: VisualThemeState) => void): () => void {
  themeEmitter.on("theme_updated", fn);
  return () => {
    themeEmitter.off("theme_updated", fn);
  };
}

export function getLastVisualTheme(): VisualThemeState | null {
  return lastVisual;
}

export function getLootLegendaryVisualState(params: any): VisualThemeState {
  return {
    auraHex: "#FFD700",
    secondaryHex: "#3f2f05",
    mode: "loot_legendary",
    glitchIntensity: 0.8,
    phaseShiftPulseHz: 1.2,
    hazardIndex: params.probability ? Math.min(1, params.probability * 1000) : 0.5,
    aggressionTrend: 0,
  };
}

export function pushLootAura(params: any): VisualThemeState {
  const visual = getLootLegendaryVisualState(params);
  lastVisual = visual;
  themeEmitter.emit(THEME_HAZARD_EVENT, { visual, payload: params });
  themeEmitter.emit("theme_updated", visual);
  return visual;
}
