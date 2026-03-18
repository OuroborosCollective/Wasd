const fs = require('fs');
let content = fs.readFileSync('server/src/modules/npc/NPCSystem.ts', 'utf8');

// I accidentally inserted it twice. Let's fix this up.
content = content.replace(
  `} else if (npc.state === "sleep") {
        npc.needs.energy = Math.min(100, npc.needs.energy + 2); // Fast regen while sleeping
        if (npc.needs.energy >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "eat") {
        npc.needs.hunger = Math.min(100, npc.needs.hunger + 5); // Faster regen while eating
        if (npc.needs.hunger >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "sleep") {
        npc.needs.energy = Math.min(100, npc.needs.energy + 0.5); // Regain energy
        if (npc.needs.energy >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "eat") {
        npc.needs.hunger = Math.min(100, npc.needs.hunger + 2.0); // Eat quickly
        if (npc.needs.hunger >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      }`,
  `} else if (npc.state === "sleep") {
        npc.needs.energy = Math.min(100, npc.needs.energy + 2); // Fast regen while sleeping
        if (npc.needs.energy >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      } else if (npc.state === "eat") {
        npc.needs.hunger = Math.min(100, npc.needs.hunger + 5); // Faster regen while eating
        if (npc.needs.hunger >= 100) {
          npc.state = "idle";
          npc.stateTimer = now + Math.random() * 2000 + 1000;
        }
      }`
);

fs.writeFileSync('server/src/modules/npc/NPCSystem.ts', content);
