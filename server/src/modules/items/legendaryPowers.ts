// @ts-nocheck
/**
 * Legendary / aspect-style proc hooks. Integrate after a successful hit with final damage.
 */

export type LegendaryCombatEntity = {
  health: number;
  maxHealth: number;
};

export type PowerContext = {
  attacker: LegendaryCombatEntity;
  target: LegendaryCombatEntity;
  dmg: number;
  crit: boolean;
};

export type LegendaryPower = {
  id: string;
  name: string;
  description: string;
  onHit?: (ctx: PowerContext) => { extraDmg?: number; heal?: number; slowMs?: number } | void;
};

export const POWERS: Record<string, LegendaryPower> = {
  lp_vampiric: {
    id: "lp_vampiric",
    name: "Vampiric",
    description: "Heilt dich um 8% des verursachten Schadens.",
    onHit: (ctx) => ({ heal: Math.floor(ctx.dmg * 0.08) }),
  },
  lp_execute: {
    id: "lp_execute",
    name: "Executioner",
    description: "Wenn das Ziel unter 20% HP ist: +35% Schaden.",
    onHit: (ctx) => {
      const hpMax = Math.max(1, ctx.target.maxHealth);
      if (ctx.target.health / hpMax <= 0.2) return { extraDmg: Math.floor(ctx.dmg * 0.35) };
    },
  },
};

export type LegendaryProcResult = { extraDmg: number; heal: number; slowMs: number };

export function emptyProcResult(): LegendaryProcResult {
  return { extraDmg: 0, heal: 0, slowMs: 0 };
}

function mergeProc(into: LegendaryProcResult, next: { extraDmg?: number; heal?: number; slowMs?: number } | undefined) {
  if (!next) return;
  if (typeof next.extraDmg === "number" && next.extraDmg > 0) into.extraDmg += next.extraDmg;
  if (typeof next.heal === "number" && next.heal > 0) into.heal += next.heal;
  if (typeof next.slowMs === "number" && next.slowMs > 0) into.slowMs += next.slowMs;
}

/** Collect procs from optional `legendaryPowerId` on equipped weapon/armor rows. */
function legendaryIdFromEquipRow(
  row: { legendaryPowerId?: string; uid?: string } | null | undefined,
  gearInventory: unknown
): string | undefined {
  if (row && typeof row.legendaryPowerId === "string" && row.legendaryPowerId.trim()) {
    return row.legendaryPowerId.trim();
  }
  const uid = typeof row?.uid === "string" ? row.uid.trim() : "";
  if (!uid || !Array.isArray(gearInventory)) return undefined;
  const g = gearInventory.find((x: any) => x && x.uid === uid);
  const lid = g?.legendaryPowerId;
  return typeof lid === "string" && lid.trim() ? lid.trim() : undefined;
}

export function applyLegendaryPowersFromEquipment(
  equipment: { weapon?: { legendaryPowerId?: string; uid?: string } | null; armor?: { legendaryPowerId?: string; uid?: string } | null },
  ctx: PowerContext,
  gearInventory?: unknown
): LegendaryProcResult {
  const out = emptyProcResult();
  const ids = [
    legendaryIdFromEquipRow(equipment?.weapon, gearInventory),
    legendaryIdFromEquipRow(equipment?.armor, gearInventory),
  ].filter((x): x is string => Boolean(x));
  for (const id of ids) {
    const p = POWERS[id];
    if (!p?.onHit) continue;
    const proc = p.onHit(ctx);
    if (proc) mergeProc(out, proc);
  }
  return out;
}
