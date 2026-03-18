const fs = require('fs');
let file = 'server/src/core/WorldTick.ts';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  'import { GameConfig } from "../config/GameConfig.js";',
  'import { GameConfig } from "../config/GameConfig.js";\nimport { ResourceSystem } from "../modules/world/ResourceSystem.js";'
);

// Add property
content = content.replace(
  'public lootSystem: LootSystem;',
  'public lootSystem: LootSystem;\n  public resourceSystem: ResourceSystem;'
);

// Instantiate in constructor
content = content.replace(
  'this.lootSystem = new LootSystem();',
  'this.lootSystem = new LootSystem();\n    this.resourceSystem = new ResourceSystem();\n    this.resourceSystem.initializeNodes();'
);

fs.writeFileSync(file, content);
