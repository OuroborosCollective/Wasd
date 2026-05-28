import { Container, Graphics, Text } from 'pixi.js';
import { DEFAULT_ARELORIAN_HUD_THEME, type ArelorianHudTheme } from './ArelorianHudTheme';

export type ArelorianHudState = {
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  stamina: number;
  maxStamina: number;
  matrixEnergy: number;
  zoneName: string;
  playerName: string;
  skillSlots: string[];
};

const DEFAULT_STATE: ArelorianHudState = {
  health: 100,
  maxHealth: 100,
  energy: 75,
  maxEnergy: 100,
  stamina: 90,
  maxStamina: 100,
  matrixEnergy: 0,
  zoneName: 'Areloria',
  playerName: 'Wanderer',
  skillSlots: ['1', '2', '3', '4', '5'],
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function valueRatio(value: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  return clamp01(value / max);
}

export class ArelorianHud extends Container {
  private readonly theme: ArelorianHudTheme;
  private state: ArelorianHudState;
  private readonly panel = new Graphics();
  private readonly bars = new Graphics();
  private readonly slots = new Graphics();
  private readonly slotLabels = new Container();
  private readonly titleText: Text;
  private readonly statusText: Text;
  private readonly matrixText: Text;
  private widthPx = 1280;
  private heightPx = 720;

  constructor(state: Partial<ArelorianHudState> = {}, theme: Partial<ArelorianHudTheme> = {}) {
    super();
    this.theme = { ...DEFAULT_ARELORIAN_HUD_THEME, ...theme };
    this.state = { ...DEFAULT_STATE, ...state };

    this.titleText = new Text({
      text: '',
      style: { fill: this.theme.textPrimary, fontFamily: this.theme.fontFamily, fontSize: 18, fontWeight: '700' },
    });
    this.statusText = new Text({
      text: '',
      style: { fill: this.theme.textMuted, fontFamily: this.theme.fontFamily, fontSize: 12 },
    });
    this.matrixText = new Text({
      text: '',
      style: { fill: this.theme.matrix, fontFamily: this.theme.fontFamily, fontSize: 14, fontWeight: '700' },
    });

    this.addChild(this.panel, this.bars, this.slots, this.slotLabels, this.titleText, this.statusText, this.matrixText);
    this.renderHud();
  }

  resize(width: number, height: number): void {
    this.widthPx = Math.max(320, width);
    this.heightPx = Math.max(240, height);
    this.renderHud();
  }

  updateState(nextState: Partial<ArelorianHudState>): void {
    this.state = { ...this.state, ...nextState };
    this.renderHud();
  }

  private renderHud(): void {
    const panelX = 18;
    const panelY = this.heightPx - 156;
    const panelWidth = Math.min(420, this.widthPx - 36);
    const panelHeight = 132;

    this.panel.clear();
    this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 14);
    this.panel.fill({ color: this.theme.panelFill, alpha: this.theme.panelAlpha });
    this.panel.stroke({ color: this.theme.panelStroke, alpha: this.theme.panelStrokeAlpha, width: 2 });

    this.titleText.text = `${this.state.playerName} · ${this.state.zoneName}`;
    this.titleText.position.set(panelX + 18, panelY + 12);

    this.statusText.text = `HP ${this.state.health}/${this.state.maxHealth} · EN ${this.state.energy}/${this.state.maxEnergy} · ST ${this.state.stamina}/${this.state.maxStamina}`;
    this.statusText.position.set(panelX + 18, panelY + 38);

    this.matrixText.text = `Matrix-Energie: ${this.state.matrixEnergy}`;
    this.matrixText.position.set(panelX + 18, panelY + 112);

    this.bars.clear();
    this.drawBar(panelX + 18, panelY + 60, panelWidth - 36, 10, valueRatio(this.state.health, this.state.maxHealth), this.theme.health);
    this.drawBar(panelX + 18, panelY + 76, panelWidth - 36, 10, valueRatio(this.state.energy, this.state.maxEnergy), this.theme.energy);
    this.drawBar(panelX + 18, panelY + 92, panelWidth - 36, 10, valueRatio(this.state.stamina, this.state.maxStamina), this.theme.stamina);

    this.drawSkillSlots(panelX + panelWidth + 16, this.heightPx - 76);
  }

  private drawBar(x: number, y: number, width: number, height: number, ratio: number, color: number): void {
    this.bars.roundRect(x, y, width, height, 6);
    this.bars.fill({ color: 0x02060c, alpha: 0.7 });
    this.bars.roundRect(x, y, Math.max(height, width * ratio), height, 6);
    this.bars.fill({ color, alpha: 0.95 });
  }

  private drawSkillSlots(x: number, y: number): void {
    this.slots.clear();
    this.slotLabels.removeChildren();

    const slotSize = 44;
    const gap = 8;
    const visibleSlots = this.state.skillSlots.slice(0, 8);

    for (let index = 0; index < visibleSlots.length; index += 1) {
      const slotX = x + index * (slotSize + gap);
      if (slotX + slotSize > this.widthPx - 18) break;

      this.slots.roundRect(slotX, y, slotSize, slotSize, 10);
      this.slots.fill({ color: this.theme.slotFill, alpha: 0.84 });
      this.slots.stroke({ color: this.theme.slotStroke, alpha: 0.7, width: 2 });

      const label = new Text({
        text: visibleSlots[index],
        style: { fill: this.theme.textPrimary, fontFamily: this.theme.fontFamily, fontSize: 14, fontWeight: '700' },
      });
      label.anchor.set(0.5);
      label.position.set(slotX + slotSize / 2, y + slotSize / 2);
      label.name = `skill-slot-label-${index}`;
      this.slotLabels.addChild(label);
    }
  }
}

export function createArelorianHud(state?: Partial<ArelorianHudState>, theme?: Partial<ArelorianHudTheme>): ArelorianHud {
  return new ArelorianHud(state, theme);
}
