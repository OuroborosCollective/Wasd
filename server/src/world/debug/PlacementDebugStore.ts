// @ts-nocheck
/**
 * PlacementDebugStore — Stores debug info for placement visualization.
 * Only active in debug/admin mode.
 */

export interface DebugPlacementEntry {
  id: string;
  state: string;
  category: string;
  position: { x: number; y: number };
  profile: string;
  corrections: string[];
  issues: string[];
  timestamp: number;
}

export class PlacementDebugStore {
  private entries: Map<string, DebugPlacementEntry> = new Map();
  private enabled = false;
  private maxEntries = 200;

  setEnabled(enabled: boolean): void { this.enabled = enabled; }
  isEnabled(): boolean { return this.enabled; }

  record(entry: DebugPlacementEntry): void {
    if (!this.enabled) return;
    this.entries.set(entry.id, entry);

    // Trim oldest
    if (this.entries.size > this.maxEntries) {
      const oldest = Array.from(this.entries.keys())[0];
      this.entries.delete(oldest);
    }
  }

  getRejected(): DebugPlacementEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.state === "rejected");
  }

  getCorrected(): DebugPlacementEntry[] {
    return Array.from(this.entries.values()).filter((e) => e.state === "corrected");
  }

  getAll(): DebugPlacementEntry[] {
    return Array.from(this.entries.values());
  }

  clear(): void { this.entries.clear(); }
}

export const placementDebugStore = new PlacementDebugStore();
