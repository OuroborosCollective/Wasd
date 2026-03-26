const fs = require('fs');

let content = fs.readFileSync('server/src/modules/npc/NPCSystem.ts', 'utf8');

// Insert the needs update logic right at the start of the NPC tick processing loop
const targetStr = `    for (const npc of this.npcs.values()) {
`;

const replacementStr = `    for (const npc of this.npcs.values()) {
      // 0. Process dynamic needs
      if (!npc.needs) npc.needs = { hunger: 100, energy: 100 }; // Fallback for existing NPCs

      // Decrease needs incrementally based on 10 ticks/sec rate:
      // Hunger: 1 unit per 10 seconds (0.01/tick)
      // Energy: 0.5 unit per 10 seconds (0.005/tick)
      npc.needs.hunger = Math.max(0, npc.needs.hunger - 0.01);
      npc.needs.energy = Math.max(0, npc.needs.energy - 0.005);

`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('server/src/modules/npc/NPCSystem.ts', content);
