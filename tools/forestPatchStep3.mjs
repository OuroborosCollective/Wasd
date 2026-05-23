import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('private processForestResourceActions()')) {
  const methods = `
  private processForestResourceActions() {
    for (const [key, until] of [...this.depletedResources.entries()]) {
      if (until <= this.tickCount) this.depletedResources.delete(key);
    }
    const queue = this.pendingForestResourceActions.splice(0, this.pendingForestResourceActions.length);
    for (const request of queue) {
      const player = this.playerSystem.getPlayer(request.playerId);
      if (!player || player.isOffline) continue;
      const checked = checkForestResource(request.input);
      if (!checked.ok) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: checked.reason }); continue; }
      if (!isNearForestResource(player, checked.coord, FOREST_ACTION_DISTANCE)) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: "too_far" }); continue; }
      if ((this.depletedResources.get(checked.key) ?? 0) > this.tickCount) { this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_REJECTED", reason: "depleted" }); continue; }
      this.inventorySystem.addItem(player, { id: checked.itemId, quantity: 1, source: "forest_resource", resourceType: checked.resourceType });
      player.questLog ??= { collected: {} };
      player.questLog.collected ??= {};
      player.questLog.collected[checked.itemId] = safeInt(player.questLog.collected[checked.itemId], 0) + 1;
      this.depletedResources.set(checked.key, this.tickCount + FOREST_RESPAWN_TICKS);
      this.ws.sendToPlayer(request.socketId, { type: "FOREST_RESOURCE_ACCEPTED", resourceKey: checked.key, itemId: checked.itemId, quantity: 1, respawnTick: this.tickCount + FOREST_RESPAWN_TICKS });
    }
  }
`;
  src = src.replace('  private handleAttack(id: string, player: any, msg: any)', `${methods}\n  private handleAttack(id: string, player: any, msg: any)`);
}
if (!src.includes('this.processForestResourceActions();')) {
  src = src.replace('    this.worldSystem.tick();\n', '    this.worldSystem.tick();\n    this.processForestResourceActions();\n');
}
fs.writeFileSync(path, src);
