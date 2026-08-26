import { campNpcService, type CampNpcService, type CampStockStateSnapshot } from "./CampNpcService.js";
import type { CampStockPersistenceAdapter } from "./CampStockPersistence.js";
import { JsonCampStockPersistenceAdapter } from "./JsonCampStockPersistenceAdapter.js";

export class CampStockRuntime {
  private readonly hydratedPoiIds = new Set<string>();
  private readonly locks = new Map<string, Promise<void>>();

  public constructor(
    private readonly service: CampNpcService = campNpcService,
    private readonly persistence: CampStockPersistenceAdapter = new JsonCampStockPersistenceAdapter(),
  ) {}

  public async hydratePoi(poiId: string): Promise<void> {
    if (this.hydratedPoiIds.has(poiId)) return;
    await this.runExclusive(poiId, async () => {
      if (this.hydratedPoiIds.has(poiId)) return;
      const persisted = await this.persistence.loadStockState(poiId);
      if (persisted) this.service.commitStockState(poiId, persisted);
      this.hydratedPoiIds.add(poiId);
    });
  }

  public async hydratePois(poiIds: readonly string[]): Promise<void> {
    for (const poiId of [...new Set(poiIds)].sort()) await this.hydratePoi(poiId);
  }

  public async commitStockState(poiId: string, state: CampStockStateSnapshot): Promise<void> {
    await this.runExclusive(poiId, async () => {
      await this.persistence.saveStockState(poiId, state);
      this.service.commitStockState(poiId, state);
      this.hydratedPoiIds.add(poiId);
    });
  }

  public async restoreStockState(poiId: string, state: CampStockStateSnapshot | undefined): Promise<void> {
    await this.runExclusive(poiId, async () => {
      await this.persistence.saveStockState(poiId, state ?? null);
      this.service.restoreStockState(poiId, state);
      this.hydratedPoiIds.add(poiId);
    });
  }

  public resetHydrationForTests(poiId?: string): void {
    if (poiId) this.hydratedPoiIds.delete(poiId);
    else this.hydratedPoiIds.clear();
  }

  private async runExclusive<T>(poiId: string, work: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(poiId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => gate);
    this.locks.set(poiId, tail);
    await previous;
    try {
      return await work();
    } finally {
      release();
      if (this.locks.get(poiId) === tail) this.locks.delete(poiId);
    }
  }
}

export const campStockRuntime = new CampStockRuntime();
