import type { CampStockStateSnapshot } from "./CampNpcService.js";

export interface CampStockPersistenceAdapter {
  loadStockState(poiId: string): Promise<CampStockStateSnapshot | null>;
  saveStockState(poiId: string, state: CampStockStateSnapshot | null): Promise<void>;
}
