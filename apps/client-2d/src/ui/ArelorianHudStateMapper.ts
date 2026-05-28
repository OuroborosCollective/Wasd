import type { ArelorianHudState } from './ArelorianHud';

export const HUD_TICK_HZ = 10;
export const HUD_TICK_MS = 1000 / HUD_TICK_HZ;

export type HudCharacterSource = {
  name?: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  gold?: number;
};

export type HudSkillSource = {
  id: string;
  ready?: boolean;
  cooldownTicksRemaining?: number;
  cooldownTicks?: number;
  cdTicks?: number;
  cd?: number;
};

export type HudStateSource = {
  character: HudCharacterSource;
  skills: HudSkillSource[];
  connected: boolean;
  zoneName?: string;
};

function integerTicks(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

export function msToHudCooldownTicks(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms / HUD_TICK_MS));
}

export function getSkillCooldownTicks(skill: HudSkillSource): number {
  return integerTicks(skill.cooldownTicksRemaining)
    ?? integerTicks(skill.cooldownTicks)
    ?? integerTicks(skill.cdTicks)
    ?? msToHudCooldownTicks(typeof skill.cd === 'number' ? skill.cd : 0);
}

export function mapToArelorianHudState(source: HudStateSource): Partial<ArelorianHudState> {
  const skillCooldownTicks = source.skills.slice(0, 5).map(getSkillCooldownTicks);

  return {
    health: source.character.hp ?? 100,
    maxHealth: source.character.maxHp ?? 100,
    energy: source.character.mp ?? 0,
    maxEnergy: source.character.maxMp ?? 1,
    stamina: source.skills.filter((skill) => getSkillCooldownTicks(skill) <= 0).length,
    maxStamina: Math.max(1, source.skills.length),
    matrixEnergy: source.character.gold ?? 0,
    playerName: source.character.name ?? 'Player',
    zoneName: source.zoneName ?? (source.connected ? 'Millbrook' : 'Areloria'),
    skillSlots: source.skills.slice(0, 5).map((_, index) => `${index + 1}`),
    skillCooldownTicks,
  };
}
