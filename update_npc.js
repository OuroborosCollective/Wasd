const fs = require('fs');

let content = fs.readFileSync('server/src/modules/npc/NPCSystem.ts', 'utf8');
content = content.replace(
  'brain: new NPCBrain()',
  'brain: new NPCBrain(),\n      needs: { hunger: 100, energy: 100 }'
);
fs.writeFileSync('server/src/modules/npc/NPCSystem.ts', content);
