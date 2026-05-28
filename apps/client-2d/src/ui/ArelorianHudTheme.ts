export type ArelorianHudTheme = {
  fontFamily: string;
  panelFill: number;
  panelAlpha: number;
  panelStroke: number;
  panelStrokeAlpha: number;
  textPrimary: number;
  textMuted: number;
  health: number;
  energy: number;
  stamina: number;
  matrix: number;
  slotFill: number;
  slotStroke: number;
};

export const DEFAULT_ARELORIAN_HUD_THEME: ArelorianHudTheme = {
  fontFamily: 'Arial, sans-serif',
  panelFill: 0x08111f,
  panelAlpha: 0.78,
  panelStroke: 0x58d7ff,
  panelStrokeAlpha: 0.55,
  textPrimary: 0xf4fbff,
  textMuted: 0x8aa9b7,
  health: 0xff4f6d,
  energy: 0x62d7ff,
  stamina: 0xffd166,
  matrix: 0x9dff8f,
  slotFill: 0x111d33,
  slotStroke: 0x3c6f91,
};
