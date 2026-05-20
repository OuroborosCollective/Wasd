// @ARE-GUARD-EXEMPT: core meta
import {
  IMPACT_BUSTER_BASE_DAMAGE,
  IMPACT_BUSTER_COOLDOWN_KEY,
  IMPACT_BUSTER_COOLDOWN_MS,
  IMPACT_BUSTER_RADIUS,
  IMPACT_BUSTER_STAMINA_COST,
} from "../modules/skill/impactBusterConfig.js";

type ImpactBusterFailureReason =
  | "dead"
  | "locked"
  | "stamina"
  | "cooldown";

export type ImpactBusterEligibility = {
  ok: boolean;
  reason?: ImpactBusterFailureReason;
  toast: string;
  cooldownUntil?: number;
};

export type ImpactBusterHit = {
  npcId: string;
  damage: number;
  distance: number;
  killed: boolean;
  healthAfter: number;
};

export type ImpactBusterResult = {
  hits: ImpactBusterHit[];
  totalDamage: number;
  cooldownUntil: number;
  staminaAfter: number;
};

function ensureSkillCooldownMap(player: any): Record<string, number> {
  if (!player.skillCooldowns || typeof player.skillCooldowns !== "object") {
    player.skillCooldowns = {};
  }
  return player.skillCooldowns as Record<string, number>;
}

export function canUseImpactBuster(player: any, now: number): ImpactBusterEligibility {
  if (player?.dead) {
    return { ok: false, reason: "dead", toast: "You are defeated." };
  }
  if (!player?.impactBusterUnlocked) {
    return {
      ok: false,
      reason: "locked",
      toast: "Impact Buster is locked. Clear a Worldboss Dungeon first.",
    };
  }
  const stamina = Number(player?.stamina ?? 0);
  if (!Number.isFinite(stamina) || stamina < IMPACT_BUSTER_STAMINA_COST) {
    return {
      ok: false,
      reason: "stamina",
      toast: "Not enough stamina for Impact Buster.",
    };
  }
  const cooldowns = ensureSkillCooldownMap(player);
  const cooldownUntil = Number(cooldowns[IMPACT_BUSTER_COOLDOWN_KEY] ?? 0);
  if (Number.isFinite(cooldownUntil) && cooldownUntil > now) {
    return {
      ok: false,
      reason: "cooldown",
      toast: "Impact Buster is recharging.",
      cooldownUntil,
    };
  }
  return { ok: true, toast: "Impact Buster ready." };
}

export function executeImpactBuster(player: any, allNpcs: any[], now: number): ImpactBusterResult {
  const cooldowns = ensureSkillCooldownMap(player);
  const hits: ImpactBusterHit[] = [];
  const level = Math.max(1, Number(player?.level) || 1);
  const baseDamage = IMPACT_BUSTER_BASE_DAMAGE + Math.floor(level * 1.6);
  const px = Number(player?.position?.x ?? 0);
  const py = Number(player?.position?.y ?? 0);

  for (const npc of allNpcs) {
    if (!npc || typeof npc.id !== "string") continue;
    if ((Number(npc.health) || 0) <= 0) continue;
    const nx = Number(npc.position?.x ?? 0);
    const ny = Number(npc.position?.y ?? 0);
    const distance = Math.hypot(nx - px, ny - py);
    if (distance > IMPACT_BUSTER_RADIUS) continue;

    const falloff = Math.max(0.35, 1 - (distance / IMPACT_BUSTER_RADIUS) * 0.65);
    const damage = Math.max(1, Math.floor(baseDamage * falloff));
    npc.health = Math.max(0, (Number(npc.health) || 0) - damage);
    const killed = npc.health <= 0;
    hits.push({
      npcId: npc.id,
      damage,
      distance,
      killed,
      healthAfter: npc.health,
    });
  }

  player.stamina = Math.max(0, (Number(player?.stamina) || 0) - IMPACT_BUSTER_STAMINA_COST);
  const cooldownUntil = now + IMPACT_BUSTER_COOLDOWN_MS;
  cooldowns[IMPACT_BUSTER_COOLDOWN_KEY] = cooldownUntil;
  return {
    hits,
    totalDamage: hits.reduce((sum, hit) => sum + hit.damage, 0),
    cooldownUntil,
    staminaAfter: Number(player.stamina) || 0,
  };
}
