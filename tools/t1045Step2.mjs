import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('areTopologyNetwork.seedCore("core:singularity", 0);')) {
  src = src.replace('    this.warfrontSystem = new WarfrontSystem();\n', '    this.warfrontSystem = new WarfrontSystem();\n    areTopologyNetwork.seedCore("core:singularity", 0);\n');
}
if (!src.includes('areTopologyNetwork.seedCore("player:dummy_player", 0);')) {
  src = src.replace('    this.observerEngine.register("dummy_player", { x: 500, y: 500 });\n', '    this.observerEngine.register("dummy_player", { x: 500, y: 500 });\n    areTopologyNetwork.seedCore("player:dummy_player", 0);\n');
}
if (!src.includes('public getARETopologySnapshot()')) {
  src = src.replace('  public getAREShadowReplayStats(): any {\n', '  public getARETopologySnapshot(): any { return areTopologyNetwork.snapshot(this.tickCount); }\n\n  public getAREShadowReplayStats(): any {\n');
}
fs.writeFileSync(path, src);
