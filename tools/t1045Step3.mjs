import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('private updateARETopology(')) {
  const method = `
  private updateARETopology(strippedPlayers: any[], strippedNpcs: any[]): void {
    const entries = [
      ...strippedPlayers.map((p) => ({ id: `player:${p.id}`, position: p.position })),
      ...strippedNpcs.map((n) => ({ id: `npc:${n.id}`, position: n.position })),
    ].sort((a, b) => a.id.localeCompare(b.id));

    for (const entry of entries) areTopologyNetwork.ensureNode(entry.id, this.tickCount);

    const cells = new Map<string, string[]>();
    for (const entry of entries) {
      const key = kappaCellOf(entry);
      const bucket = cells.get(key) ?? [];
      bucket.push(entry.id);
      cells.set(key, bucket);
    }

    for (const ids of [...cells.values()]) {
      ids.sort();
      for (let i = 1; i < ids.length; i += 1) areTopologyNetwork.observeInteraction(ids[i - 1], ids[i], this.tickCount);
    }
  }
`;
  src = src.replace('  private updateAREContract(payload: AREGuardPayload, strippedPlayers: any[], strippedNpcs: any[], strippedLoot: any[]) {', `${method}\n  private updateAREContract(payload: AREGuardPayload, strippedPlayers: any[], strippedNpcs: any[], strippedLoot: any[]) {`);
}
if (!src.includes('this.updateARETopology(strippedPlayers, strippedNpcs);')) {
  src = src.replace('    this.runAREShadowTick(strippedPlayers, strippedNpcs);\n', '    this.updateARETopology(strippedPlayers, strippedNpcs);\n    this.runAREShadowTick(strippedPlayers, strippedNpcs);\n');
}
if (!src.includes('const topology = this.getARETopologySnapshot();')) {
  src = src.replace('    const usage = deterministicUsageTracker.getStats(this.tickCount);\n', '    const usage = deterministicUsageTracker.getStats(this.tickCount);\n    const topology = this.getARETopologySnapshot();\n');
}
if (!src.includes('areTopology: topology')) {
  src = src.replace('areShadow: this.getAREShadowReplayStats(), oracle:', 'areShadow: this.getAREShadowReplayStats(), areTopology: topology, oracle:');
  src = src.replace('shadow: this.getAREShadowReplayStats() }, replay:', 'shadow: this.getAREShadowReplayStats(), topology }, replay:');
}
fs.writeFileSync(path, src);
