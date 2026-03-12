export class WorldSnapshotSystem {
  private snapshots: any[] = [];

  save(worldState: any) {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(worldState))
    });
  }

  latest() {
    return this.snapshots[this.snapshots.length - 1] ?? null;
  }
}