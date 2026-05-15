export interface AREPulseColorInput {
  tickHz?: number;
  phase?: number;
  resonance?: number;
  threatLevel?: number;
}

export interface AREPulseColorFrame {
  pulse: number;
  resonance: number;
  marina: string;
  neon: string;
  fire: string;
  marinaRgb: string;
  neonRgb: string;
  fireRgb: string;
  glowStrength: number;
  rootStyle: Record<string, string | number>;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mixChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * clamp01(t));
}

function rgbString(rgb: [number, number, number]): string {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

function hexString(rgb: [number, number, number]): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [mixChannel(a[0], b[0], t), mixChannel(a[1], b[1], t), mixChannel(a[2], b[2], t)];
}

/**
 * UI-side 10-Hz color bridge. One deterministic Math.sin tick controls color, glow and hazard intensity.
 */
export function deriveAREPulseColorFrame(timeSeconds: number, input: AREPulseColorInput = {}): AREPulseColorFrame {
  const tickHz = input.tickHz ?? 10;
  const phase = input.phase ?? 0;
  const payloadResonance = clamp01(input.resonance ?? 0.5);
  const threat = clamp01(input.threatLevel ?? 0);
  const rawPulse = Math.sin(timeSeconds * tickHz * Math.PI * 2 + phase);
  const pulse = (rawPulse + 1) / 2;
  const resonance = clamp01(payloadResonance * 0.68 + pulse * 0.32);

  const marina = mixRgb([0, 229, 255], [57, 255, 20], resonance * 0.36);
  const neon = mixRgb([57, 255, 20], [0, 229, 255], pulse * 0.28);
  const fire = mixRgb([255, 122, 0], [230, 0, 0], Math.max(threat, 1 - resonance) * 0.82);
  const glowStrength = 0.28 + resonance * 0.52;

  return {
    pulse,
    resonance,
    marina: hexString(marina),
    neon: hexString(neon),
    fire: hexString(fire),
    marinaRgb: rgbString(marina),
    neonRgb: rgbString(neon),
    fireRgb: rgbString(fire),
    glowStrength,
    rootStyle: {
      '--pulse': pulse.toFixed(4),
      '--pulse-resonance': resonance.toFixed(4),
      '--pulse-marina': hexString(marina),
      '--pulse-neon': hexString(neon),
      '--pulse-fire': hexString(fire),
      '--pulse-marina-rgb': rgbString(marina),
      '--pulse-neon-rgb': rgbString(neon),
      '--pulse-fire-rgb': rgbString(fire),
      '--pulse-glow': glowStrength.toFixed(4),
    },
  };
}
