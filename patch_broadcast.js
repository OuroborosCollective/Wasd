const fs = require('fs');
let file = 'server/src/core/WorldTick.ts';
let content = fs.readFileSync(file, 'utf8');

const replaceBlock = `    const lootWithGlb = Array.from(this.lootEntities.values()).map(loot => {
      let glbPath = this.glbRegistry.getModelForTarget("object_single", loot.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("object_group", loot.item?.id);
      return { ...loot, glbPath };
    });`;

const newBlock = `    const lootWithGlb = Array.from(this.lootEntities.values()).map(loot => {
      let glbPath = this.glbRegistry.getModelForTarget("object_single", loot.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("object_group", loot.item?.id);
      return { ...loot, glbPath };
    });

    const resourcesWithGlb = this.resourceSystem.getAllNodes().map(node => {
      let glbPath = this.glbRegistry.getModelForTarget("object_single", node.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("object_group", node.type); // "tree", "rock", etc
      return { ...node, glbPath };
    });`;

content = content.replace(replaceBlock, newBlock);

const replaceBlock2 = `      npcs: npcsWithGlb,
      loot: lootWithGlb,
      onlinePlayers: this.socketToPlayer.size`;

const newBlock2 = `      npcs: npcsWithGlb,
      loot: lootWithGlb,
      resources: resourcesWithGlb,
      onlinePlayers: this.socketToPlayer.size`;

content = content.replace(replaceBlock2, newBlock2);

fs.writeFileSync(file, content);
