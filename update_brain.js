const fs = require('fs');
let content = fs.readFileSync('server/src/modules/ai/BehaviorTree.ts', 'utf8');

// Replace the placeholder static checks with dynamic checks
content = content.replace(
  'if (npc.needs?.sleep) return { action: "sleep", thought: "Evaluating local heuristics: Priority [Rest]. Reasoning: Energy critically low." };',
  'if (npc.needs?.energy < 20) return { action: "sleep", thought: "Evaluating local heuristics: Priority [Rest]. Reasoning: Energy critically low." };'
);
content = content.replace(
  'if (npc.needs?.hunger) return { action: "eat", thought: "Evaluating local heuristics: Priority [Food]. Reasoning: Nutrient reserves depleted." };',
  'if (npc.needs?.hunger < 20) return { action: "eat", thought: "Evaluating local heuristics: Priority [Food]. Reasoning: Nutrient reserves depleted." };'
);

fs.writeFileSync('server/src/modules/ai/BehaviorTree.ts', content);
