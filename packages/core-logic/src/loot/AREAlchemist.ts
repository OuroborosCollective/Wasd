import type { LootDrop, LootQuality, LootRollContext } from "./ARELootTypes";
import { stableHash } from "./ARELootEngine";

export type EssenceKind = "commonEssence" | "arcaneEssence" | "sovereignEssence" | "legendaryResidue";

export type EssenceWallet = Record<EssenceKind, number>;

export interface DecompositionContext extends Pick<LootRollContext, "seed" | "worldHash" | "chunkHash" | "chunkId" | "tick" | "actorId" | "playerPublicKey"> {
  reason?: "manual" | "auto_salvage" | "selfheal";
}

export interface DecompositionYield {
  kind: EssenceKind;
  amount: number;
}

export interface DecompositionResult {
  destroyedItem: Pick<LootDrop, "itemId" | "name" | "quality" | "tier" | "quantity" | "rollHash">;
  yields: DecompositionYield[];
  residueHash: string;
  echo: {
    sector: string;
    summary: string;
    emily: string;
  };
}

export interface EssenceBuffRequest {
  wallet: EssenceWallet;
  spend: Partial<EssenceWallet>;
  context: Pick<LootRollContext, "seed" | "worldHash" | "chunkHash" | "tick" | "actorId" | "sourceId" | "playerPublicKey">;
}

export interface EssenceBuffResult {
  acceptedSpend: EssenceWallet;
  remainingWallet: EssenceWallet;
  modifiers: NonNullable<LootRollContext["modifiers"]>;
  buffHash: string;
  summary: string;
}

const ZERO_WALLET: EssenceWallet = {
  commonEssence: 0,
  arcaneEssence: 0,
  sovereignEssence: 0,
  legendaryResidue: 0,
};

const QUALITY_MULTIPLIER: Record<LootQuality, number> = {
  common: 1,
  magic: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
  mythic: 32,
};

export class AREAlchemist {
  decompose(drop: LootDrop, context: DecompositionContext): DecompositionResult {
    const residueHash = stableHash([
      "ARE_ALCHEMY",
      context.seed,
      context.worldHash,
      context.chunkHash,
      context.chunkId,
      context.tick,
      context.actorId,
      context.playerPublicKey ?? "solo",
      drop.itemId,
      drop.quality,
      drop.tier,
      drop.quantity,
      drop.rollHash,
    ].join("|"));

    const base = Math.max(1, drop.tier) * Math.max(1, drop.quantity);
    const q = QUALITY_MULTIPLIER[drop.quality] ?? 1;
    const pulse = hashToRange(residueHash, 0, Math.max(2, q));
    const commonEssence = Math.max(1, base + pulse);
    const yields: DecompositionYield[] = [{ kind: "commonEssence", amount: commonEssence }];

    if (["magic", "rare", "epic", "legendary", "mythic"].includes(drop.quality)) {
      yields.push({ kind: "arcaneEssence", amount: Math.max(1, Math.floor((base * q) / 4) + hashToRange(residueHash, 8, 3)) });
    }
    if (["epic", "legendary", "mythic"].includes(drop.quality)) {
      yields.push({ kind: "sovereignEssence", amount: Math.max(1, Math.floor((base * q) / 12) + hashToRange(residueHash, 16, 2)) });
    }
    if (["legendary", "mythic"].includes(drop.quality)) {
      yields.push({ kind: "legendaryResidue", amount: Math.max(1, Math.floor((base * q) / 24) + hashToRange(residueHash, 24, 2)) });
    }

    const sector = context.chunkId;
    return {
      destroyedItem: {
        itemId: drop.itemId,
        name: drop.name,
        quality: drop.quality,
        tier: drop.tier,
        quantity: drop.quantity,
        rollHash: drop.rollHash,
      },
      yields,
      residueHash,
      echo: {
        sector,
        summary: `Molecular refinement · ${drop.quality.toUpperCase()} ${drop.name} → ${formatYields(yields)}`,
        emily: `Architekt Thomas, ${drop.name} wurde in Sektor ${sector} kontrolliert zerlegt. Molekularer Zerfall stabil. Gewonnen: ${formatYields(yields)}.`,
      },
    };
  }

  applyYields(wallet: Partial<EssenceWallet>, yields: DecompositionYield[]): EssenceWallet {
    const next = normalizeWallet(wallet);
    for (const y of yields) {
      next[y.kind] += Math.max(0, Math.floor(y.amount));
    }
    return next;
  }

  createEssenceBuff(request: EssenceBuffRequest): EssenceBuffResult {
    const wallet = normalizeWallet(request.wallet);
    const spend = normalizeWallet(request.spend);
    const acceptedSpend: EssenceWallet = { ...ZERO_WALLET };
    const remainingWallet: EssenceWallet = { ...wallet };

    for (const key of Object.keys(ZERO_WALLET) as EssenceKind[]) {
      acceptedSpend[key] = Math.max(0, Math.min(wallet[key], Math.floor(spend[key])));
      remainingWallet[key] = wallet[key] - acceptedSpend[key];
    }

    const buffPower =
      acceptedSpend.commonEssence * 1 +
      acceptedSpend.arcaneEssence * 3 +
      acceptedSpend.sovereignEssence * 9 +
      acceptedSpend.legendaryResidue * 25;

    const cappedPower = Math.min(250, buffPower);
    const buffHash = stableHash([
      "ARE_ESSENCE_BUFF",
      request.context.seed,
      request.context.worldHash,
      request.context.chunkHash,
      request.context.tick,
      request.context.actorId,
      request.context.sourceId,
      request.context.playerPublicKey ?? "solo",
      JSON.stringify(acceptedSpend),
    ].join("|"));

    const modifiers: NonNullable<LootRollContext["modifiers"]> = {
      noDrop: Math.max(0.72, 1 - cappedPower / 2000),
      magic: 1 + acceptedSpend.arcaneEssence / 250,
      rare: 1 + acceptedSpend.sovereignEssence / 180,
      epic: 1 + acceptedSpend.sovereignEssence / 420,
      legendary: 1 + acceptedSpend.legendaryResidue / 260,
      mythic: 1 + acceptedSpend.legendaryResidue / 900,
      quantity: 1,
    };

    return {
      acceptedSpend,
      remainingWallet,
      modifiers,
      buffHash,
      summary: `Essence buff accepted · power=${cappedPower} · hash=${buffHash.slice(0, 12)}`,
    };
  }
}

export function normalizeWallet(wallet: Partial<EssenceWallet> = {}): EssenceWallet {
  return {
    commonEssence: Math.max(0, Math.floor(wallet.commonEssence ?? 0)),
    arcaneEssence: Math.max(0, Math.floor(wallet.arcaneEssence ?? 0)),
    sovereignEssence: Math.max(0, Math.floor(wallet.sovereignEssence ?? 0)),
    legendaryResidue: Math.max(0, Math.floor(wallet.legendaryResidue ?? 0)),
  };
}

export function formatYields(yields: DecompositionYield[]): string {
  return yields.map((y) => `${y.amount} ${y.kind}`).join(", ");
}

function hashToRange(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8), 16) % Math.max(1, modulo);
}
