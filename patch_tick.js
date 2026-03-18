const fs = require('fs');
let file = 'server/src/core/WorldTick.ts';
let content = fs.readFileSync(file, 'utf8');

const replaceBlock = `    this.npcSystem.tick(players, this.chatSystem);
    this.worldSystem.tick();`;

const newBlock = `    this.npcSystem.tick(players, this.chatSystem);
    this.worldSystem.tick();
    this.resourceSystem.tick();`;

content = content.replace(replaceBlock, newBlock);

fs.writeFileSync(file, content);
