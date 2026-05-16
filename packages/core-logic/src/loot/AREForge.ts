import type { EssenceKind, EssenceWallet } from "./AREAlchemist";
import { normalizeWallet } from "./AREAlchemist";
import type { LootItemDefinition, LootQuality, LootRollContext } from "./ARELootTypes";
import { stableHash } from "./ARELootEngine";

export interface ForgeBlueprintIngredient {
  kind: EssenceKind;
  amount: number;
}

export interface ForgeBlueprint {
  id: string;
  name: string;
  rarity: LootQuality;
  requiredTickMod?: number;
  sectorAffinity?: string;
  ingredients: ForgeBlueprintIngredient[];
  result: Omit<LootItemDefinition, "id" | "name" | "baseQuality" | "tier"> & {
    itemId: string;
    name: string;
    quality: LootQuality;
    tier: number;
  };
  tags?: string[];
}

export interface ForgeContext extends Pick<LootRollContext, "seed" | "worldHash" | "chunkHash" | "chunkId" | "tick" | "actorId" | "playerPublicKey"> {
  forgeId: string;
}

export interface ForgeAttempt {
  blueprint: ForgeBlueprint;
  wallet: Partial<EssenceWallet>;
  context: ForgeContext;
}

export interface ForgedItem extends LootItemDefinition {
  forgeHash: string;
  blueprintId: string;
  stability: number;
}

export interface ForgeResult {
  ok: boolean;
  blueprintId: string;
  forgedItem?: ForgedItem;
  consumed: EssenceWallet;
  remainingWallet: EssenceWallet;
  forgeHash: string;
  stability: number;
  errors: string[];
  echo: {
    sector: string;
    summary: string;
    emily: string;
  };
}

const ZERO_WALLET: EssenceWallet = {
  commonEssence: 0,
  arcaneEssence: 0,
  sovereignEssence: 0,
  legendaryResidue: 0,
};

export class AREForge {
  private readonly blueprints = new Map<string, ForgeBlueprint>();

  constructor(blueprints: ForgeBlueprint[] = defaultForgeBlueprints) {
    for (const blueprint of blueprints) this.blueprints.set(blueprint.id, blueprint);
  }

  getBlueprint(id: string): ForgeBlueprint | undefined {
    return this.blueprints.get(id);
  }

  listBlueprints(): ForgeBlueprint[] {
    return [...this.blueprints.values()];
  }

  craft(attempt: ForgeAttempt): ForgeResult {
    const wallet = normalizeWallet(attempt.wallet);
    const blueprint = attempt.blueprint;
    const forgeHash = stableHash([
      "ARE_FORGE",
      attempt.context.seed,
      attempt.context.worldHash,
      attempt.context.chunkHash,
      attempt.context.chunkId,
      attempt.context.tick,
      attempt.context.actorId,
      attempt.context.playerPublicKey ?? "solo",
      attempt.context.forgeId,
      blueprint.id,
      JSON.stringify(blueprint.ingredients),
    ].join("|"));

    const errors: string[] = [];
    const consumed: EssenceWallet = { ...ZERO_WALLET };
    const remainingWallet: EssenceWallet = { ...wallet };

    for (const ingredient of blueprint.ingredients) {
      const need = Math.max(0, Math.floor(ingredient.amount));
      if (wallet[ingredient.kind] < need) {
        errors.push(`insufficient ${ingredient.kind}: need ${need}, have ${wallet[ingredient.kind]}`);
      }
      consumed[ingredient.kind] = need;
    }

    if (blueprint.requiredTickMod && blueprint.requiredTickMod > 0) {
      const tickGate = attempt.context.tick % blueprint.requiredTickMod;
      const hashGate = hashToRange(forgeHash, 0, blueprint.requiredTickMod);
      if (tickGate !== hashGate) {
        errors.push(`blueprint tick gate mismatch: tick%${blueprint.requiredTickMod}=${tickGate}, hashGate=${hashGate}`);
      }
    }

    if (blueprint.sectorAffinity && blueprint.sectorAffinity !== attempt.context.chunkId) {
      errors.push(`sector affinity mismatch: requires ${blueprint.sectorAffinity}, got ${attempt.context.chunkId}`);
    }

    const stability = calculateStability(forgeHash, blueprint.rarity);

    if (errors.length > 0) {
      return {
        ok: false,
        blueprintId: blueprint.id,
        consumed: { ...ZERO_WALLET },
        remainingWallet: wallet,
        forgeHash,
        stability,
        errors,
        echo: {
          sector: attempt.context.chunkId,
          summary: `Forge rejected · ${blueprint.name} · ${errors[0]}`,
          emily: `Schmiedevorgang blockiert. Blueprint-Kausalität nicht vollständig geschlossen: ${errors[0]}.`,
        },
      };
    }

    for (const ingredient of blueprint.ingredients) {
      remainingWallet[ingredient.kind] -= Math.max(0, Math.floor(ingredient.amount));
    }

    const forgedItem: ForgedItem = {
      id: `${blueprint.result.itemId}:${forgeHash.slice(0, 12)}`,
      name: blueprint.result.name,
      itemType: blueprint.result.itemType,
      baseQuality: blueprint.result.quality,
      tier: blueprint.result.tier,
      tags: [...(blueprint.result.tags ?? []), ...(blueprint.tags ?? []), "forged", `blueprint:${blueprint.id}`],
      glbAssetId: blueprint.result.glbAssetId,
      forgeHash,
      blueprintId: blueprint.id,
      stability,
    };

    return {
      ok: true,
      blueprintId: blueprint.id,
      forgedItem,
      consumed,
      remainingWallet,
      forgeHash,
      stability,
      errors: [],
      echo: {
        sector: attempt.context.chunkId,
        summary: `Forge complete · ${forgedItem.name} · stability ${(stability * 100).toFixed(2)}%`,
        emily: `Schmiedevorgang stabil. Blueprint-Kausalität bei ${(stability * 100).toFixed(2)}%. ${forgedItem.name} wurde in Sektor ${attempt.context.chunkId} manifestiert.`,
      },
    };
  }
}

export const defaultForgeBlueprints: ForgeBlueprint[] = [
  {
    id: "bp_echo_blade_t2",
    name: "Blueprint: Echo Blade",
    rarity: "rare",
    ingredients: [
      { kind: "commonEssence", amount: 8 },
      { kind: "arcaneEssence", amount: 3 },
    ],
    result: {
      itemId: "echo_blade",
      name: "Echo Blade",
      itemType: "weapon",
      quality: "rare",
      tier: 2,
      tags: ["melee", "echo", "deterministic"],
    },
    tags: ["starter-forge"],
  },
  {
    id: "bp_sovereign_circuit_t4",
    name: "Blueprint: Sovereign Circuit",
    rarity: "epic",
    sectorAffinity: "12:8",
    ingredients: [
      { kind: "commonEssence", amount: 14 },
      { kind: "arcaneEssence", amount: 8 },
      { kind: "sovereignEssence", amount: 2 },
    ],
    result: {
      itemId: "sovereign_circuit",
      name: "Sovereign Circuit",
      itemType: "trinket",
      quality: "epic",
      tier: 4,
      tags: ["sovereign", "technology", "blueprint"],
    },
    tags: ["science-portal"],
  },
  {
    id: "bp_ouroboros_anvil_t5",
    name: "Blueprint: Ouroboros Anvil Core",
    rarity: "legendary",
    requiredTickMod: 10,
    sectorAffinity: "12:8",
    ingredients: [
      { kind: "commonEssence", amount: 32 },
      { kind: "arcaneEssence", amount: 16 },
      { kind: "sovereignEssence", amount: 5 },
      { kind: "legendaryResidue", amount: 1 },
    ],
    result: {
      itemId: "ouroboros_anvil_core",
      name: "Ouroboros Anvil Core",
      itemType: "relic",
      quality: "legendary",
      tier: 5,
      tags: ["forge", "worldhash", "creation"],
    },
    tags: ["endgame", "causality"],
  },
];

export function createDefaultAREForge(): AREForge {
  return new AREForge(defaultForgeBlueprints);
}

function calculateStability(hash: string, rarity: LootQuality): number {
  const baseByRarity: Record<LootQuality, number> = {
    common: 0.98,
    magic: 0.96,
    rare: 0.94,
    epic: 0.91,
    legendary: 0.88,
    mythic: 0.84,
  };
  const jitter = hashToRange(hash, 8, 1200) / 10000;
  return Math.min(1, Math.max(0.01, (baseByRarity[rarity] ?? 0.9) + jitter));
}

function hashToRange(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8).padEnd(8, "0"), 16) % Math.max(1, modulo);
}
