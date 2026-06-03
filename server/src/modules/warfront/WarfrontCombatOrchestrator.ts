import type { NPC } from "../npc/NPCSystem.js";
import { NPCSystem } from "../npc/NPCSystem.js";
import { PlayerSystem } from "../player/PlayerSystem.js";
import { CombatService, type CombatState } from "../combat/CombatService.js";
import { npcFactionAdapter } from "../faction/NPCFactionAdapter.js";
import { mulberry32, warfrontSeed } from "./warfrontRng.js";
import { WarfrontCombatTelemetry, type WarfrontHudAgent, type WarfrontHudSnapshot } from "./WarfrontCombatTelemetry.js";

const WF_PREFIX = "wf_";
const STRIKE_RANGE = 42;
const SKILL_OPENING: CombatState = { comboIndex: 0, lastSkillId: null, lastTimestamp: 0 };

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pickTarget(
  attacker: NPC,
  others: NPC[],
  dummy: { id: string; position: { x: number; y: number } } | null,
  rng: () => number,
): { id: string; kind: "npc" | "dummy"; pos: { x: number; y: number } } | null {
  const agg = attacker.traits?.aggression ?? 0.5;
  const cands: Array<{ id: string; kind: "npc" | "dummy"; pos: { x: number; y: number }; d: number }> = [];

  for (const o of others) {
    if (o.id === attacker.id) continue;
    if ((o.health ?? 0) <= 0) continue;
    const d = dist2(attacker.position, o.position);
    if (d > STRIKE_RANGE) continue;
    if (agg < 0.32) continue;
    cands.push({ id: o.id, kind: "npc", pos: { x: o.position.x, y: o.position.y }, d });
  }

  if (dummy && agg >= 0.42) {
    const d = dist2(attacker.position, dummy.position);
    if (d <= STRIKE_RANGE) {
      cands.push({ id: dummy.id, kind: "dummy", pos: { x: dummy.position.x, y: dummy.position.y }, d });
    }
  }

  if (cands.length === 0) return null;
  cands.sort((a, b) =>
    a.d === b.d ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.d - b.d
  );
  const idx = Math.floor(rng() * cands.length);
  const t = cands[Math.min(idx, cands.length - 1)]!;
  return { id: t.id, kind: t.kind, pos: t.pos };
}

function buildHud(
  tick: number,
  npcs: NPC[],
  dummyPl: { position: { x: number; y: number }; health?: number; maxHealth?: number } | null,
  lastSummary: string | null,
): WarfrontHudSnapshot {
  const ox = dummyPl?.position.x ?? 500;
  const oy = dummyPl?.position.y ?? 500;
  const agents: WarfrontHudAgent[] = [];
  for (const n of npcs) {
    if (!n.id.startsWith(WF_PREFIX)) continue;
    agents.push({
      id: n.id,
      name: n.name ?? n.id,
      x: n.position.x,
      y: n.position.y,
      hp: Math.max(0, n.health ?? 0),
      hpMax: Math.max(1, n.maxHealth ?? 90),
      aggression: n.traits?.aggression ?? 0,
      side: "warfront",
    });
  }
  agents.push({
    id: "dummy_player",
    name: "Warfront dummy",
    x: ox,
    y: oy,
    hp: Math.max(0, dummyPl?.health ?? 100),
    hpMax: Math.max(1, dummyPl?.maxHealth ?? 100),
    aggression: 0,
    side: "dummy",
  });
  return {
    tick,
    originX: ox,
    originY: oy,
    agents,
    lastEventSummary: lastSummary,
  };
}

export function runWarfrontCombatTick(opts: {
  tickCount: number;
  npcSystem: NPCSystem;
  playerSystem: PlayerSystem;
  combatService: CombatService;
  broadcast?: (payload: unknown) => void;
}): void {
  const { tickCount, npcSystem, playerSystem, combatService, broadcast } = opts;
  const tel = WarfrontCombatTelemetry.getInstance();

  // Mini hook: deterministic NPC faction context without changing NPCSystem internals.
  // The adapter rebuilds only every 10 ticks and reuses the previous frozen snapshot otherwise.
  const factionSnapshot = npcFactionAdapter.tick({
    tickCount,
    npcSystem,
    worldSeed: "areloria:warfront:faction-hook:v1",
  });

  if (broadcast && tickCount % 10 === 0) {
    broadcast({
      type: "NPC_FACTION_SNAPSHOT",
      tick: tickCount,
      payload: factionSnapshot,
    });
  }

  const dummy = playerSystem.getPlayer("dummy_player");
  const dummyRef = dummy
    ? { id: dummy.id, position: { x: dummy.position.x, y: dummy.position.y } }
    : null;

  const allNpcs = npcSystem.getAllNPCs();
  const warNpcs = allNpcs
    .filter((n) => n.id.startsWith(WF_PREFIX))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  let lastSummary: string | null = null;

  for (const attacker of warNpcs) {
    if ((attacker.health ?? 0) <= 0) continue;

    const rng = mulberry32(warfrontSeed(tickCount, attacker.id));
    const others = allNpcs.filter((n) => n.id !== attacker.id);
    const tgt = pickTarget(attacker, others, dummyRef, rng);
    if (!tgt) continue;

    const skill = {
      id: "ember_bolt",
      baseDamage: Math.max(4, Math.floor(5 + (attacker.traits?.aggression ?? 0.5) * 18)),
    };
    const { damage } = combatService.handleSkillRequest(attacker.id, skill, { ...SKILL_OPENING });

    const hitRoll = rng();
    const agg = attacker.traits?.aggression ?? 0.5;
    const hit = hitRoll < 0.56 + (agg - 0.4) * 0.45;
    const applied = hit ? Math.max(1, Math.floor(damage)) : 0;
    if (applied <= 0) continue;

    let killed = false;
    if (tgt.kind === "npc") {
      const def = npcSystem.getNPC(tgt.id);
      if (!def) continue;
      def.health = Math.max(0, (def.health ?? def.maxHealth ?? 90) - applied);
      if (def.health <= 0) {
        killed = true;
        def.health = def.maxHealth ?? 90;
      }
    } else {
      const pl = playerSystem.getPlayer(tgt.id);
      if (!pl) continue;
      pl.health = Math.max(0, (pl.health ?? pl.maxHealth ?? 100) - applied);
      if (pl.health <= 0) {
        killed = true;
        pl.health = pl.maxHealth ?? 100;
        pl.dead = false;
      }
    }

    const summaryHit = `Combat hit · ${attacker.id} → ${tgt.id} · ${applied} dmg @tick ${tickCount}`;
    const summaryKill = `Combat kill · ${attacker.id} dropped ${tgt.id} · ${applied} dmg @tick ${tickCount} · respawn`;
    lastSummary = killed ? summaryKill : summaryHit;

    if (killed) {
      tel.recordKill({
        tick: tickCount,
        attackerId: attacker.id,
        defenderId: tgt.id,
        damage: applied,
        summary: summaryKill,
      });
    } else {
      tel.recordHit({
        tick: tickCount,
        attackerId: attacker.id,
        defenderId: tgt.id,
        damage: applied,
        summary: summaryHit,
      });
    }

    if (broadcast) {
      broadcast({
        type: "warfront_pulse",
        tick: tickCount,
        attackerId: attacker.id,
        defenderId: tgt.id,
        damage: applied,
        kill: killed,
      });
    }
  }

  const dummyPl = dummy
    ? {
        position: { x: dummy.position.x, y: dummy.position.y },
        health: dummy.health,
        maxHealth: dummy.maxHealth,
      }
    : null;
  tel.setHud(buildHud(tickCount, allNpcs, dummyPl, lastSummary));
}

export function bootstrapWarfrontNpcs(npcSystem: NPCSystem): void {
  const band: Array<{ id: string; name: string; x: number; y: number; aggression: number }> = [
    { id: "wf_raider_alpha", name: "Raider Alpha", x: 518, y: 502, aggression: 0.84 },
    { id: "wf_skirmisher_beta", name: "Skirmisher Beta", x: 486, y: 498, aggression: 0.58 },
    { id: "wf_picket_gamma", name: "Picket Gamma", x: 500, y: 518, aggression: 0.44 },
  ];
  for (const b of band) {
    if (npcSystem.getNPC(b.id)) continue;
    npcSystem.createNPC(b.id, b.name, b.x, b.y);
    const n = npcSystem.getNPC(b.id);
    if (!n) continue;
    n.traits = { ...(n.traits ?? { faith: 0.5, curiosity: 0.5 }), aggression: b.aggression };
    n.health = 92;
    n.maxHealth = 92;
    n.stamina = 100;
    n.skills = { combat: { level: Math.max(2, Math.min(12, Math.round(b.aggression * 12))) } };
  }
}
