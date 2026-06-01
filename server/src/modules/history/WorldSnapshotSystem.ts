import { deepClone } from "../../utils/deepClone.js";

export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      state: deepClone(worldState)
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}