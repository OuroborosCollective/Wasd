const fs = require('fs');

const file = 'server/src/modules/npc/NPCSystem.ts';
let code = fs.readFileSync(file, 'utf8');

const oldTick = `      if (npc.state === "idle") {
        if (now > npc.stateTimer) {
          // Decide next action
          const r = Math.random();
          if (r < 0.4) {
            npc.state = "wandering";
            // Pick a random spot near home
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30;
            npc.targetPosition = {
              x: npc.homePosition.x + Math.cos(angle) * dist,
              y: npc.homePosition.y + Math.sin(angle) * dist
            };
            npc.stateTimer = now + 10000; // Max wander time
          } else if (r < 0.7) {
            npc.state = "working";
            // Move back to home position (workplace)
            npc.targetPosition = { x: npc.homePosition.x, y: npc.homePosition.y };
            npc.stateTimer = now + 15000; // Work for 15s
          } else {
            npc.stateTimer = now + Math.random() * 3000 + 2000; // Stay idle
          }
        }
      }`;

const newTick = `      if (npc.state === "idle") {
        if (now > npc.stateTimer) {
          if (!npc.brain) npc.brain = new NPCBrain();
          const decision = npc.brain.update(npc);

          if (chatSystem && npc.state !== decision.action) {
            chatSystem.systemMessage(\`[Thought] \${npc.name}: \${decision.thought}\`);
          }

          if (decision.action === "wander" || decision.action === "wandering") {
            npc.state = "wandering";
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30;
            npc.targetPosition = {
              x: npc.homePosition.x + Math.cos(angle) * dist,
              y: npc.homePosition.y + Math.sin(angle) * dist
            };
            npc.stateTimer = now + 10000;
          } else if (decision.action === "work" || decision.action === "working") {
            npc.state = "working";
            npc.targetPosition = { x: npc.homePosition.x, y: npc.homePosition.y };
            npc.stateTimer = now + 15000;
          } else {
            npc.state = decision.action;
            npc.stateTimer = now + Math.random() * 3000 + 2000;
          }
        }
      }`;

code = code.replace(oldTick, newTick);
fs.writeFileSync(file, code);
