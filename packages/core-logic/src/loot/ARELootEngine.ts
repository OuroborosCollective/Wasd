import type {
  LootDrop,
  LootItemDefinition,
  LootQuality,
  LootRegistrySnapshot,
  LootRollContext,
  LootRollResult,
  LootRollStep,
  TreasureClassDefinition,
  TreasureClassEntry,
} from "./ARELootTypes";

const QUALITY_ORDER: LootQuality[] = ["common", "magic", "rare", "epic", "legendary", "mythic"];

export interface ARELootEngineOptions {
  maxDepth?: number;
}

export class ARELootEngine {
  private readonly items = new Map<string, LootItemDefinition>();
  private readonly treasureClasses = new Map<string, TreasureClassDefinition>();
  private readonly maxDepth: number;

  constructor(snapshot: LootRegistrySnapshot, options: ARELootEngineOptions = {}) {
    for (const item of snapshot.items) this.items.set(item.id, item);
    for (const treasureClass of snapshot.treasureClasses) this.treasureClasses.set(treasureClass.id, treasureClass);
    this.maxDepth = options.maxDepth ?? 8;
  }

  roll(rootTreasureClassId: string, context: LootRollContext): LootRollResult {
    const drops: LootDrop[] = [];
    const steps: LootRollStep[] = [];
    this.rollTreasureClass(rootTreasureClassId, context, drops, steps, 0, 0);
    return {
      context,
      rootTreasureClassId,
      drops,
      steps,
      finalHash: stableHash(`${context.seed}|${context.worldHash}|${context.chunkHash}|${context.tick}|${rootTreasureClassId}|${drops.map((drop) => drop.itemId).join(",")}`),
    };
  }

  getItem(itemId: string): LootItemDefinition | undefined {
    return this.items.get(itemId);
  }

  getTreasureClass(id: string): TreasureClassDefinition | undefined {
    return this.treasureClasses.get(id);
  }

  private rollTreasureClass(
    treasureClassId: string,
    context: LootRollContext,
    drops: LootDrop[],
    steps: LootRollStep[],
    depth: number,
    parentPickIndex: number,
  ): void {
    if (depth > this.maxDepth) {
      steps.push({
        depth,
        pickIndex: parentPickIndex,
        treasureClassId,
        selectedEntryId: "depth-limit",
        selectedType: "noDrop",
        rollValue: 0,
        totalWeight: 0,
        rollHash: stableHash(`${context.seed}|depth-limit|${treasureClassId}|${depth}`),
        note: "Loot recursion depth limit reached. Self-heal fallback stopped recursion.",
      });
      return;
    }

    const treasureClass = this.treasureClasses.get(treasureClassId);
    if (!treasureClass) {
      steps.push({
        depth,
        pickIndex: parentPickIndex,
        treasureClassId,
        selectedEntryId: "missing-treasure-class",
        selectedType: "noDrop",
        rollValue: 0,
        totalWeight: 0,
        rollHash: stableHash(`${context.seed}|missing-tc|${treasureClassId}|${depth}`),
        note: `Treasure class ${treasureClassId} missing. Drop skipped safely.`,
      });
      return;
    }

    const picks = Math.abs(treasureClass.numPicks);
    const guaranteedMode = treasureClass.numPicks < 0;

    for (let pickIndex = 0; pickIndex < picks; pickIndex += 1) {
      const rollHash = stableHash(`${context.seed}|${context.worldHash}|${context.chunkHash}|${context.tick}|${context.actorId}|${context.sourceId}|${treasureClass.id}|${depth}|${pickIndex}`);
      const entry = guaranteedMode
        ? this.selectGuaranteedEntry(treasureClass, pickIndex)
        : this.selectWeightedEntry(treasureClass, rollHash, context);
      const weighted = this.weightedEntries(treasureClass, context);
      const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.weight, 0);
      const rollValue = totalWeight > 0 ? hashToInt(rollHash) % totalWeight : 0;

      steps.push({
        depth,
        pickIndex,
        treasureClassId: treasureClass.id,
        selectedEntryId: entry.id,
        selectedType: entry.type,
        rollValue,
        totalWeight,
        rollHash,
      });

      if (entry.type === "noDrop") continue;

      if (entry.type === "treasureClass") {
        this.rollTreasureClass(entry.id, context, drops, steps, depth + 1, pickIndex);
        continue;
      }

      if (entry.type === "dynamic") {
        const dynamicIds = treasureClass.dynamicPools?.[entry.id] ?? [];
        const itemId = dynamicIds.length > 0 ? dynamicIds[hashToInt(`${rollHash}|dynamic`) % dynamicIds.length] : "";
        this.addItemDrop(itemId, entry, treasureClass.id, rollHash, context, drops, steps, depth, pickIndex);
        continue;
      }

      this.addItemDrop(entry.id, entry, treasureClass.id, rollHash, context, drops, steps, depth, pickIndex);
    }
  }

  private weightedEntries(treasureClass: TreasureClassDefinition, context: LootRollContext): TreasureClassEntry[] {
    const entries = [...treasureClass.entries];
    const noDropWeight = Math.max(0, Math.floor((treasureClass.noDropWeight ?? 0) * (context.modifiers?.noDrop ?? 1)));
    if (noDropWeight > 0) entries.push({ id: "no-drop", type: "noDrop", weight: noDropWeight });
    return entries.filter((entry) => entry.weight > 0);
  }

  private selectWeightedEntry(treasureClass: TreasureClassDefinition, rollHash: string, context: LootRollContext): TreasureClassEntry {
    const entries = this.weightedEntries(treasureClass, context);
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) return { id: "no-drop", type: "noDrop", weight: 1 };
    let roll = hashToInt(rollHash) % totalWeight;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll < 0) return entry;
    }
    return entries[entries.length - 1];
  }

  private selectGuaranteedEntry(treasureClass: TreasureClassDefinition, pickIndex: number): TreasureClassEntry {
    const realEntries = treasureClass.entries.filter((entry) => entry.type !== "noDrop" && entry.weight > 0);
    if (realEntries.length === 0) return { id: "no-drop", type: "noDrop", weight: 1 };
    return realEntries[pickIndex % realEntries.length];
  }

  private addItemDrop(
    itemId: string,
    entry: TreasureClassEntry,
    treasureClassId: string,
    rollHash: string,
    context: LootRollContext,
    drops: LootDrop[],
    steps: LootRollStep[],
    depth: number,
    pickIndex: number,
  ): void {
    const item = this.items.get(itemId);
    if (!item) {
      steps.push({
        depth,
        pickIndex,
        treasureClassId,
        selectedEntryId: itemId || "missing-item",
        selectedType: "noDrop",
        rollValue: 0,
        totalWeight: 0,
        rollHash,
        note: `Item ${itemId || "<empty>"} missing. Quality fallback skipped safely.`,
      });
      return;
    }

    const quality = this.resolveQuality(item, entry.qualityHint, rollHash, context);
    const quantityBase = Math.max(1, entry.quantity ?? 1);
    const quantityMod = Math.max(1, Math.floor(context.modifiers?.quantity ?? 1));
    drops.push({
      itemId: item.id,
      name: item.name,
      quality,
      tier: item.tier,
      quantity: quantityBase * quantityMod,
      tags: item.tags ?? [],
      glbAssetId: item.glbAssetId,
      sourceTreasureClass: treasureClassId,
      rollHash,
    });
  }

  private resolveQuality(item: LootItemDefinition, qualityHint: LootQuality | undefined, rollHash: string, context: LootRollContext): LootQuality {
    const hinted = qualityHint ?? item.baseQuality;
    const hintedIndex = QUALITY_ORDER.indexOf(hinted);
    const baseIndex = QUALITY_ORDER.indexOf(item.baseQuality);
    const ceiling = Math.max(baseIndex, hintedIndex);
    const qualityPulse = hashToInt(`${rollHash}|quality|${context.playerPublicKey ?? "solo"}`) % 10000;

    const modifier = (quality: LootQuality) => context.modifiers?.[quality] ?? 1;
    const thresholds: Array<[LootQuality, number]> = [
      ["mythic", Math.floor(12 * modifier("mythic"))],
      ["legendary", Math.floor(75 * modifier("legendary"))],
      ["epic", Math.floor(260 * modifier("epic"))],
      ["rare", Math.floor(950 * modifier("rare"))],
      ["magic", Math.floor(2600 * modifier("magic"))],
    ];

    for (const [quality, threshold] of thresholds) {
      const index = QUALITY_ORDER.indexOf(quality);
      if (index <= ceiling && qualityPulse < threshold) return quality;
    }

    return item.baseQuality;
  }
}

export function stableHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const a = (h2 >>> 0).toString(16).padStart(8, "0");
  const b = (h1 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}${stableHashTail(input)}`;
}

function stableHashTail(input: string): string {
  let state = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    state ^= input.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  const parts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    state = Math.imul(state ^ (state >>> 13), 1103515245) + 12345;
    parts.push((state >>> 0).toString(16).padStart(8, "0"));
  }
  return parts.join("");
}

function hashToInt(hash: string): number {
  return Number.parseInt(hash.slice(0, 12), 16);
}
