import { createARESeed, SeededARERng } from "../../core/determinism/AREDeterminism.js";

export type CombatDeltaAction = "melee" | "spell";

export interface CombatDeltaEntityView {
  id?: string | number;
  playerId?: string;
  npcId?: string;
  name?: string;
  stamina?: number;
  health?: number;
  skills?: {
    combat?: {
      level?: number;
    };
  };
  identity?: {
    npcId?: string;
  };
}

export interface CombatDeltaContext {
  tick: number;
  sequence: number;
  weaponBonus?: number;
}

export interface CombatDeltaResult {
  success: boolean;
  hit: boolean;
  damage: number;
  crit: boolean;
  killed: boolean;
  defenderHealth: number;
  reason?: "no_stamina";
}

export interface CombatDelta {
  kind: "combat_delta";
  action: CombatDeltaAction;
  tick: number;
  sequence: number;
  attackerId: string;
  defenderId: string;
  staminaDelta: number;
  healthDelta: number;
  result: CombatDeltaResult;
}

export interface CombatStatePatch {
  attacker: {
    id: string;
    stamina: number;
  };
  defender: {
    id: string;
    health: number;
  };
}

const STAMINA_COST = 8;

function safeInteger(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value as number) : fallback;
}

function stableEntityId(entity: CombatDeltaEntityView): string {
  return String(
    entity.id ??
    entity.playerId ??
    entity.npcId ??
    entity.identity?.npcId ??
    entity.name ??
    "entity",
  );
}

function combatLevel(entity: CombatDeltaEntityView): number {
  return Math.max(1, safeInteger(entity.skills?.combat?.level, 1));
}

export function calculateCombatHitChance(
  attacker: CombatDeltaEntityView | number,
  defender: CombatDeltaEntityView | number,
): number {
  const atk = typeof attacker === "number" ? attacker : combatLevel(attacker);
  const def = typeof defender === "number" ? defender : combatLevel(defender);

  if (atk === def) return 0.65;
  if (atk >= 1000 && def <= 1) return 0.95;
  if (atk <= 1 && def >= 1000) return 0.3;

  const base = 0.65;
  const diff = (atk - def) / (atk + def);
  return Math.min(0.95, Math.max(0.3, base + diff * 0.3));
}

function createCombatRng(
  action: CombatDeltaAction,
  attacker: CombatDeltaEntityView,
  defender: CombatDeltaEntityView,
  context: Required<CombatDeltaContext>,
): SeededARERng {
  return new SeededARERng(createARESeed([
    "combat_delta",
    action,
    stableEntityId(attacker),
    stableEntityId(defender),
    context.tick,
    context.sequence,
    context.weaponBonus,
    attacker.stamina ?? 0,
    defender.health ?? 0,
  ]));
}

function calculateCombatDamage(
  attacker: CombatDeltaEntityView,
  defender: CombatDeltaEntityView,
  weaponBonus: number,
  rng: SeededARERng,
): number {
  const atk = combatLevel(attacker);
  const def = combatLevel(defender);
  const base = 5 + atk + Math.max(0, weaponBonus);
  const mitigation = Math.floor(def * 0.3);
  return Math.max(1, base - mitigation + rng.nextInt(4));
}

export function resolveCombatDelta(
  action: CombatDeltaAction,
  attacker: CombatDeltaEntityView,
  defender: CombatDeltaEntityView,
  context: CombatDeltaContext,
): CombatDelta {
  const normalizedContext: Required<CombatDeltaContext> = {
    tick: safeInteger(context.tick, 0),
    sequence: safeInteger(context.sequence, 0),
    weaponBonus: safeInteger(context.weaponBonus, 0),
  };

  const attackerId = stableEntityId(attacker);
  const defenderId = stableEntityId(defender);
  const staminaBefore = typeof attacker.stamina === "number" ? attacker.stamina : 100;
  const healthBefore = typeof defender.health === "number" ? defender.health : 100;
  const staminaCost = action === "melee" ? STAMINA_COST : 0;

  if (action === "melee" && staminaBefore <= 0) {
    return Object.freeze({
      kind: "combat_delta",
      action,
      tick: normalizedContext.tick,
      sequence: normalizedContext.sequence,
      attackerId,
      defenderId,
      staminaDelta: 0,
      healthDelta: 0,
      result: Object.freeze({
        success: false,
        hit: false,
        damage: 0,
        crit: false,
        killed: false,
        defenderHealth: healthBefore,
        reason: "no_stamina",
      }),
    });
  }

  const rng = createCombatRng(action, attacker, defender, normalizedContext);
  const hit = rng.nextFloat() <= calculateCombatHitChance(attacker, defender);

  if (!hit) {
    return Object.freeze({
      kind: "combat_delta",
      action,
      tick: normalizedContext.tick,
      sequence: normalizedContext.sequence,
      attackerId,
      defenderId,
      staminaDelta: -staminaCost,
      healthDelta: 0,
      result: Object.freeze({
        success: true,
        hit: false,
        damage: 0,
        crit: false,
        killed: false,
        defenderHealth: healthBefore,
      }),
    });
  }

  const crit = rng.nextFloat() < 0.08;
  const baseDamage = calculateCombatDamage(attacker, defender, normalizedContext.weaponBonus, rng.fork("damage"));
  const damage = crit ? Math.floor(baseDamage * 1.75) : baseDamage;
  const healthAfter = Math.max(0, healthBefore - damage);

  return Object.freeze({
    kind: "combat_delta",
    action,
    tick: normalizedContext.tick,
    sequence: normalizedContext.sequence,
    attackerId,
    defenderId,
    staminaDelta: -staminaCost,
    healthDelta: healthAfter - healthBefore,
    result: Object.freeze({
      success: true,
      hit: true,
      damage,
      crit,
      killed: healthAfter <= 0,
      defenderHealth: healthAfter,
    }),
  });
}

export function reduceCombatDelta(
  attacker: CombatDeltaEntityView,
  defender: CombatDeltaEntityView,
  delta: CombatDelta,
): CombatStatePatch {
  const staminaBefore = typeof attacker.stamina === "number" ? attacker.stamina : 100;
  const healthBefore = typeof defender.health === "number" ? defender.health : 100;

  return Object.freeze({
    attacker: Object.freeze({
      id: delta.attackerId,
      stamina: Math.max(0, staminaBefore + delta.staminaDelta),
    }),
    defender: Object.freeze({
      id: delta.defenderId,
      health: Math.max(0, healthBefore + delta.healthDelta),
    }),
  });
}
