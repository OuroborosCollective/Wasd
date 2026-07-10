import { stableHash32 } from "../core/determinism/AREDeterminism.js";
import { getCampStockBuyPrice, isCampStockBuyable } from "../economy/CampStockPrices.js";
import type { WorldPoiSnapshot } from "../world/WorldPoiTypes.js";
import {
  ACTIVITY_MESSAGES,
  CAMP_OUTPUT_ITEM,
  NPC_DIALOGUE,
  getActivityPhase,
  getNpcName,
  getNpcRole,
  getNpcTypeForPoiType,
  isGatheringCamp,
  type CampNpcActivity,
  type CampNpcPosition,
  type CampNpcSnapshot,
  type CampNpcState,
  type CampNpcType,
  type CampStockEntry,
  type CampStockSnapshot,
} from "./CampNpcTypes.js";

const MAX_STOCK_PER_ITEM = 20;

export interface CampStockStateSnapshot {
  readonly items: Readonly<Record<string, number>>;
  readonly lastProcessedCycle: number;
}

export type CampStockPurchasePlan =
  | {
      readonly ok: true;
      readonly poiId: string;
      readonly itemId: string;
      readonly quantity: number;
      readonly unitPrice: number;
      readonly totalCost: number;
      readonly remainingStock: number;
      readonly nextState: CampStockStateSnapshot;
      readonly stockRevisionHash: string;
    }
  | { readonly ok: false; readonly error: string };

interface MutableCampStockState {
  items: Record<string, number>;
  lastProcessedCycle: number;
}

function validTick(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function copyState(state: CampStockStateSnapshot | MutableCampStockState): MutableCampStockState {
  return { items: { ...state.items }, lastProcessedCycle: state.lastProcessedCycle };
}

function freezeState(state: CampStockStateSnapshot | MutableCampStockState): CampStockStateSnapshot {
  return Object.freeze({
    items: Object.freeze({ ...state.items }),
    lastProcessedCycle: state.lastProcessedCycle,
  });
}

function stockHash(poiId: string, state: CampStockStateSnapshot): string {
  const items = Object.entries(state.items)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, quantity]) => `${itemId}:${quantity}`)
    .join(",");
  return stableHash32(`CAMP_STOCK_V2|${poiId}|${state.lastProcessedCycle}|${items}`).toString(16);
}

function latestDepositedCycle(currentTick: number): number {
  const cycle = Math.floor(currentTick / 40);
  return currentTick % 40 >= 30 ? cycle : cycle - 1;
}

export class CampNpcService {
  private readonly campStocks = new Map<string, MutableCampStockState>();

  public generateCampNpcs(pois: readonly WorldPoiSnapshot[], currentTick: number): CampNpcSnapshot[] {
    if (!validTick(currentTick)) return [];
    const npcs: CampNpcSnapshot[] = [];
    for (const poi of pois) {
      if (!isGatheringCamp(poi.type)) continue;
      const npcType = getNpcTypeForPoiType(poi.type);
      if (!npcType) continue;
      const activity = getActivityPhase(currentTick);
      npcs.push({
        id: this.generateNpcId(poi.id),
        type: npcType,
        name: getNpcName(npcType),
        role: getNpcRole(npcType),
        poiId: poi.id,
        position: this.generateNpcPosition(poi, npcType),
        state: this.getNpcState(activity),
        activity,
        activityMessage: ACTIVITY_MESSAGES[npcType][activity],
      });
    }
    return npcs.sort((a, b) => a.id.localeCompare(b.id));
  }

  private generateNpcId(poiId: string): string {
    return `npc:${poiId}:worker:0`;
  }

  private generateNpcPosition(poi: WorldPoiSnapshot, npcType: CampNpcType): CampNpcPosition {
    const offsets: Record<CampNpcType, { dx: number; dy: number }> = {
      camp_woodcutter: { dx: 2, dy: -1 },
      camp_miner: { dx: -1, dy: 2 },
      camp_fisher: { dx: 1, dy: 1 },
    };
    const offset = offsets[npcType];
    return {
      x: poi.position.x + offset.dx * 1000,
      y: poi.position.y + offset.dy * 1000,
    };
  }

  private getNpcState(activity: CampNpcActivity): CampNpcState {
    return activity === "depositing" ? "idle" : "working";
  }

  /** Compatibility hook retained for callers; projection is deliberately mutation-free. */
  public updateCampStock(pois: readonly WorldPoiSnapshot[], currentTick: number): void {
    void this.getCampStockSnapshots(pois, currentTick);
  }

  public projectStockState(poi: WorldPoiSnapshot, currentTick: number): CampStockStateSnapshot {
    const existing = this.campStocks.get(poi.id) ?? { items: {}, lastProcessedCycle: -1 };
    const projected = copyState(existing);
    if (!validTick(currentTick) || !isGatheringCamp(poi.type)) return freezeState(projected);
    const npcType = getNpcTypeForPoiType(poi.type);
    if (!npcType) return freezeState(projected);
    const eligibleCycle = latestDepositedCycle(currentTick);
    if (eligibleCycle <= projected.lastProcessedCycle) return freezeState(projected);
    const completedCycles = eligibleCycle - projected.lastProcessedCycle;
    const itemId = CAMP_OUTPUT_ITEM[npcType];
    projected.items[itemId] = Math.min(
      MAX_STOCK_PER_ITEM,
      Math.max(0, projected.items[itemId] ?? 0) + completedCycles,
    );
    projected.lastProcessedCycle = eligibleCycle;
    return freezeState(projected);
  }

  public getCampStockSnapshots(pois: readonly WorldPoiSnapshot[], currentTick: number): CampStockSnapshot[] {
    if (!validTick(currentTick)) return [];
    return pois
      .filter((poi) => isGatheringCamp(poi.type))
      .map((poi) => {
        const state = this.projectStockState(poi, currentTick);
        const items: CampStockEntry[] = Object.entries(state.items)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({
            itemId,
            quantity,
            buyPrice: isCampStockBuyable(itemId) ? getCampStockBuyPrice(itemId) : null,
          }))
          .sort((a, b) => a.itemId.localeCompare(b.itemId));
        const hasDepositedState = state.lastProcessedCycle >= 0;
        return Object.freeze({
          poiId: poi.id,
          items: Object.freeze(items),
          lastUpdatedTick: hasDepositedState ? state.lastProcessedCycle * 40 + 30 : currentTick,
          observedAtTick: currentTick,
          hasDepositedState,
          revisionHash: stockHash(poi.id, state),
        });
      })
      .sort((a, b) => a.poiId.localeCompare(b.poiId));
  }

  public planBuyStock(input: {
    readonly poi: WorldPoiSnapshot;
    readonly currentTick: number;
    readonly itemId: string;
    readonly quantity: number;
  }): CampStockPurchasePlan {
    if (!validTick(input.currentTick)) return { ok: false, error: "runtime_tick_unavailable" };
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { ok: false, error: "invalid_quantity" };
    if (!isGatheringCamp(input.poi.type)) return { ok: false, error: "invalid_camp" };
    const projected = this.projectStockState(input.poi, input.currentTick);
    const currentQuantity = projected.items[input.itemId] ?? 0;
    if (currentQuantity < input.quantity) return { ok: false, error: "insufficient_camp_stock" };
    const unitPrice = getCampStockBuyPrice(input.itemId);
    if (unitPrice === null) return { ok: false, error: "invalid_item" };
    const next = copyState(projected);
    const remainingStock = currentQuantity - input.quantity;
    if (remainingStock <= 0) delete next.items[input.itemId];
    else next.items[input.itemId] = remainingStock;
    const nextState = freezeState(next);
    return Object.freeze({
      ok: true as const,
      poiId: input.poi.id,
      itemId: input.itemId,
      quantity: input.quantity,
      unitPrice,
      totalCost: unitPrice * input.quantity,
      remainingStock,
      nextState,
      stockRevisionHash: stockHash(input.poi.id, nextState),
    });
  }

  public commitStockState(poiId: string, state: CampStockStateSnapshot): void {
    this.campStocks.set(poiId, copyState(state));
  }

  public getStockState(poiId: string): CampStockStateSnapshot | undefined {
    const state = this.campStocks.get(poiId);
    return state ? freezeState(state) : undefined;
  }

  public restoreStockState(poiId: string, state: CampStockStateSnapshot | undefined): void {
    if (!state) this.campStocks.delete(poiId);
    else this.campStocks.set(poiId, copyState(state));
  }

  public buyStock(input: {
    poiId: string;
    itemId: string;
    quantity: number;
  }): { ok: true; unitPrice: number; totalCost: number; remainingStock: number } | { ok: false; error: string } {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { ok: false, error: "invalid_quantity" };
    const current = this.campStocks.get(input.poiId);
    if (!current) return { ok: false, error: "invalid_camp" };
    const currentQuantity = current.items[input.itemId] ?? 0;
    if (currentQuantity < input.quantity) return { ok: false, error: "insufficient_camp_stock" };
    const unitPrice = getCampStockBuyPrice(input.itemId);
    if (unitPrice === null) return { ok: false, error: "invalid_item" };
    const remainingStock = currentQuantity - input.quantity;
    if (remainingStock <= 0) delete current.items[input.itemId];
    else current.items[input.itemId] = remainingStock;
    return { ok: true, unitPrice, totalCost: unitPrice * input.quantity, remainingStock };
  }

  public getTradingDialogue(npcType: CampNpcType): string {
    return NPC_DIALOGUE[npcType]?.trading ?? "No stock available.";
  }

  public getNpcDialogue(npcId: string, currentTick: number): { message: string; activity: CampNpcActivity } | null {
    if (!validTick(currentTick)) return null;
    const match = npcId.match(/^npc:(.+):worker:0$/);
    if (!match) return null;
    const poiTypeMatch = match[1].match(/poi:\d+:\d+:(\w+):0$/);
    if (!poiTypeMatch) return null;
    const npcType = getNpcTypeForPoiType(poiTypeMatch[1]);
    if (!npcType) return null;
    const activity = getActivityPhase(currentTick);
    return { message: this.getDialogueForNpcType(npcType, activity), activity };
  }

  private getDialogueForNpcType(npcType: CampNpcType, activity: CampNpcActivity): string {
    return activity === "depositing"
      ? `${getNpcName(npcType)}: We have some stock at camp.`
      : `${getNpcName(npcType)}: I'm working now.`;
  }

  public clearForTests(): void {
    this.campStocks.clear();
  }
}

export const campNpcService = new CampNpcService();
