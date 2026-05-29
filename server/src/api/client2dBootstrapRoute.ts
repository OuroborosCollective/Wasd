import express, { type Request, type Response, type Router } from "express";

const FREE_STARTER_NPC_COUNT = 13;
const REQUIRED_STARTER_NPC_COUNT = FREE_STARTER_NPC_COUNT + 2;

type StarterNpcRole = "merchant" | "blacksmith" | "forager" | "scout" | "builder" | "guard" | "herbalist" | "wanderer" | "miner" | "cook" | "scribe";

type StarterNpcTemplate = {
  id: string;
  name: string;
  role: StarterNpcRole;
  x: number;
  z: number;
  fixed: boolean;
  functionTag?: string;
  services?: string[];
  fateGoal?: string;
};

const FIXED_STARTER_NPCS: StarterNpcTemplate[] = [
  {
    id: "starter-merchant-mara",
    name: "Mara the Provisioner",
    role: "merchant",
    x: -1,
    z: 2,
    fixed: true,
    functionTag: "starter_trade",
    services: ["sell_rations", "buy_basic_loot", "starter_supplies"],
    fateGoal: "keep new players supplied",
  },
  {
    id: "starter-smith-brann",
    name: "Brann the Smith",
    role: "blacksmith",
    x: 1,
    z: 2,
    fixed: true,
    functionTag: "starter_smithing",
    services: ["crafting_tutorial", "weapon_salvage", "basic_repairs", "anvil_access"],
    fateGoal: "teach crafting and salvage weapons",
  },
];

const FREE_NPC_NAMES = ["Talia Reed", "Old Fen", "Korrin Vale", "Mika Thorne", "Sera Moss", "Jonn Ash", "Pip Barley", "Nara Flint", "Edda Brook", "Rowan Pike", "Lio Fern", "Veyra Stone", "Tomm Brindle"];
const FREE_NPC_ROLES: StarterNpcRole[] = ["forager", "scout", "builder", "guard", "herbalist", "wanderer", "miner", "cook", "scribe"];
const FREE_NPC_GOALS = ["map the meadow edge", "gather food", "seek a guild", "protect the road", "study the ruins", "find better work", "trade rumors", "repair a hut", "search for herbs", "avoid danger"];
const FREE_NPC_ACTIONS = ["wandering", "foraging", "resting", "talking", "watching road", "learning", "seeking work", "inspecting village"];

function deterministicHash(parts: Array<string | number | null | undefined>): number {
  let hash = 2166136261;
  for (const part of parts) {
    const text = String(part ?? "");
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    hash ^= 1249;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function starterTick(): number {
  return Math.max(0, Math.floor(process.uptime() * 10));
}

function clampWorldCoord(value: number): number {
  return Math.max(-7, Math.min(7, Math.trunc(value)));
}

const FREE_STARTER_NPCS: StarterNpcTemplate[] = Array.from({ length: FREE_STARTER_NPC_COUNT }, (_, index) => {
  const role = FREE_NPC_ROLES[deterministicHash(["starter-free-npc-role", index]) % FREE_NPC_ROLES.length];
  return {
    id: `starter-free-${index + 1}`,
    name: FREE_NPC_NAMES[index] ?? `Settler ${index + 1}`,
    role,
    x: -4 + (index % 5) * 2,
    z: -3 + Math.floor(index / 5) * 2,
    fixed: false,
    fateGoal: FREE_NPC_GOALS[deterministicHash(["starter-free-npc-goal", index]) % FREE_NPC_GOALS.length],
  };
});

export function getClient2DStarterNpcSummaries() {
  const tick = starterTick();
  const phase = Math.floor(tick / 20);
  const fixed = FIXED_STARTER_NPCS.map(template => ({
    ...template,
    displayName: template.name,
    currentAction: template.role === "merchant" ? "trading starter supplies" : "working the anvil",
    permanent: true,
    canMigrate: false,
  }));

  const free = FREE_STARTER_NPCS.map((template, index) => {
    const wanderHash = deterministicHash(["starter-npc-wander-v1", template.id, phase]);
    const actionHash = deterministicHash(["starter-npc-action-v1", template.id, phase]);
    const dx = (wanderHash % 3) - 1;
    const dz = (Math.floor(wanderHash / 3) % 3) - 1;
    return {
      ...template,
      displayName: template.name,
      x: clampWorldCoord(template.x + dx),
      z: clampWorldCoord(template.z + dz),
      currentAction: FREE_NPC_ACTIONS[actionHash % FREE_NPC_ACTIONS.length],
      autonomyIndex: deterministicHash(["starter-npc-autonomy-v1", template.id, tick]) % 100,
      canMigrate: true,
      permanent: false,
      packIndex: index,
    };
  });

  return [...fixed, ...free];
}

export function client2dBootstrapRouter(): Router {
  const r = express.Router();

  r.get("/bootstrap", (_req: Request, res: Response) => {
    const npcs = getClient2DStarterNpcSummaries();
    const hasMerchant = npcs.some(npc => npc.role === "merchant" && npc.fixed === true);
    const hasBlacksmith = npcs.some(npc => npc.role === "blacksmith" && npc.fixed === true);

    res.json({
      ok: npcs.length === REQUIRED_STARTER_NPC_COUNT && hasMerchant && hasBlacksmith,
      contract: "client2d-bootstrap-v1",
      tick: starterTick(),
      starterNpcCount: npcs.length,
      requiredStarterNpcCount: REQUIRED_STARTER_NPC_COUNT,
      hasMerchant,
      hasBlacksmith,
      movement: {
        transport: "server-authoritative",
        action: "MOVE",
        serverEvent: "PLAYER_MOVED",
      },
      heartbeatFields: ["players", "self", "agents", "npcs", "skills"],
      fixedServices: FIXED_STARTER_NPCS.map(npc => ({
        id: npc.id,
        name: npc.name,
        role: npc.role,
        services: npc.services ?? [],
        fixed: npc.fixed,
      })),
      npcs,
    });
  });

  return r;
}
