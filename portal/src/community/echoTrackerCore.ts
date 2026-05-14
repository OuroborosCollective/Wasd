/**
 * Pure echo / beacon helpers (unit-tested, no React).
 */

export interface PhysicalIndicator {
  size: number;
  color: string;
  pulseRate: number;
  glowIntensity: number;
}

export interface SignalWaveResult {
  label: string;
  css: string;
  indicator: PhysicalIndicator;
}

export interface QuestBeacon {
  id: string;
  type: string;
  intensity: number;
  timestamp: number;
  region: string;
}

const INTENSITY_MAP: Record<string, number> = {
  COMBAT: 0.95,
  COLLECT: 0.8,
  TALK_TO: 0.7,
};

const INT_SCALE = 10000;

export function parseBeaconPayload(payload: string): QuestBeacon | null {
  if (!payload || payload.length === 0) return null;
  try {
    const parts = payload.split("|");
    if (parts.length < 2) return null;
    return {
      id: parts[0] || "",
      type: parts[1] || "COMBAT",
      intensity: INTENSITY_MAP[parts[1] ?? ""] ?? 0.1,
      timestamp: Date.now(),
      region: parts[2] || "unknown",
    };
  } catch {
    return null;
  }
}

export function getSignalStrength(questType: string): number {
  const normalized = questType.toUpperCase();
  const map: Record<string, number> = {
    COMBAT: 1.0,
    COLLECT: 0.7,
    TALK_TO: 0.4,
  };
  return map[normalized] ?? 0.1;
}

export function toPhysicalIndicator(intensity: number): PhysicalIndicator {
  const size = Math.floor(50 + intensity * 100);
  const color =
    intensity >= 0.95 ? "#ff3333" : intensity >= 0.8 ? "#ff9900" : "#33ff99";
  const pulseRate = Math.floor(2000 / (1 + intensity * 10));
  const glowIntensity = Math.floor(intensity * INT_SCALE);
  return { size, color, pulseRate, glowIntensity };
}

export function renderSignalWave(type: string, strength: number): SignalWaveResult {
  const percentage = Math.round(strength * 100);
  const indicator = toPhysicalIndicator(strength);
  return {
    label: `Signal: ${type.toUpperCase()} (${percentage}%)`,
    css: `opacity: ${strength}; transform: scale(${1 + strength}); animation-duration: ${Math.max(
      0.5,
      2 / (1 + strength * 2),
    )}s;`,
    indicator,
  };
}
