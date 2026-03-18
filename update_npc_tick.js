const fs = require('fs');

let content = fs.readFileSync('server/src/modules/npc/NPCSystem.ts', 'utf8');

// Insert the needs update logic right at the start of the NPC tick processing loop
const targetStr = `    for (const npc of this.npcs.values()) {
`;

const replacementStr = `    for (const npc of this.npcs.values()) {
      // 0. Process dynamic needs
      if (!npc.needs) npc.needs = { hunger: 100, energy: 100 }; // Fallback for existing NPCs

      // Decrease hunger slowly (approx 1 unit per 5 seconds assuming 10 ticks/sec, wait we'll make it 1 unit per 100 ticks for testing or simple rate)
      // Actually let's use a probabilistic approach or a simple small float decrement per tick.
      // 1 tick = 100ms. So 10 ticks = 1 sec.
      // 1 hunger per 100 ticks = 1 hunger per 10 sec.
      npc.needs.hunger = Math.max(0, npc.needs.hunger - 0.01);
      npc.needs.energy = Math.max(0, npc.needs.energy - 0.005);

`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('server/src/modules/npc/NPCSystem.ts', content);
