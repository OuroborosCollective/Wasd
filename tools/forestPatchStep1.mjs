import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('../modules/resource/forestResourceCheck.js')) {
  src = src.replace('import { KappaPosGrid } from "@wasd/shared";\n', 'import { KappaPosGrid } from "@wasd/shared";\nimport { checkForestResource, isNearForestResource } from "../modules/resource/forestResourceCheck.js";\nimport { FOREST_ACTION_DISTANCE, FOREST_RESPAWN_TICKS } from "../modules/resource/forestResourceRules.js";\n');
}
if (!src.includes('private pendingForestResourceActions')) {
  src = src.replace('  private lastActionTimes: Map<string, any> = new Map();\n', '  private lastActionTimes: Map<string, any> = new Map();\n  private pendingForestResourceActions: Array<{ socketId: string; playerId: string; input: any }> = [];\n  private depletedResources: Map<string, number> = new Map();\n');
}
fs.writeFileSync(path, src);
