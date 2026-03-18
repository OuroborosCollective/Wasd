const fs = require('fs');
let file = 'server/src/core/WorldTick.ts';
let content = fs.readFileSync(file, 'utf8');

// There are two places handling "interact", one in constructor and one in handleInteraction. I'll add gather there.
const replaceBlock = `      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        const loot = this.lootEntities.get(targetId);
`;

const newBlock = `      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        const loot = this.lootEntities.get(targetId);
        const resource = this.resourceSystem.nodes.get(targetId);
`;
content = content.replace(replaceBlock, newBlock);


const replaceBlock2 = `        } else if (loot) {
          const dx = player.position.x - loot.position.x;
          const dy = player.position.y - loot.position.y;
          // Optimization: Use squared distance to avoid Math.hypot() square root
          if (dx * dx + dy * dy < 400) { // 20^2
            this.inventorySystem.addItem(player, loot.item);
            this.lootEntities.delete(targetId);
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Picked up \${loot.item.name}!\` });
          } else {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: "System",
              text: "Target is too far away."
            });
          }
        }`;

const newBlock2 = `        } else if (loot) {
          const dx = player.position.x - loot.position.x;
          const dy = player.position.y - loot.position.y;
          // Optimization: Use squared distance to avoid Math.hypot() square root
          if (dx * dx + dy * dy < 400) { // 20^2
            this.inventorySystem.addItem(player, loot.item);
            this.lootEntities.delete(targetId);
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Picked up \${loot.item.name}!\` });
          } else {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: "System",
              text: "Target is too far away."
            });
          }
        } else if (resource) {
          const dx = player.position.x - resource.position.x;
          const dy = player.position.y - resource.position.y;
          if (dx * dx + dy * dy < 400) {
            const gatherResult = this.resourceSystem.gatherNode(targetId);
            if (gatherResult.success && gatherResult.item) {
              this.inventorySystem.addItem(player, gatherResult.item);
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Gathered \${gatherResult.item.name}!\` });
            } else {
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: gatherResult.reason || "Cannot gather that." });
            }
          } else {
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Target is too far away." });
          }
        }`;
content = content.replace(replaceBlock2, newBlock2);


// Patch handleInteraction method as well
const replaceBlock3 = `    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);

    if (npc) {`;

const newBlock3 = `    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);
    const resource = this.resourceSystem.nodes.get(targetId);

    if (npc) {`;
content = content.replace(replaceBlock3, newBlock3);


const replaceBlock4 = `    } else if (loot) {
      const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
      if (dist > GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      this.inventorySystem.addItem(player, loot.item);
      this.lootEntities.delete(targetId);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Picked up \${loot.item.name}!\` });
      this.debouncedSave();
    }`;

const newBlock4 = `    } else if (loot) {
      const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
      if (dist > GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      this.inventorySystem.addItem(player, loot.item);
      this.lootEntities.delete(targetId);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Picked up \${loot.item.name}!\` });
      this.debouncedSave();
    } else if (resource) {
      const dist = Math.hypot(player.position.x - resource.position.x, player.position.y - resource.position.y);
      if (dist > GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      const gatherResult = this.resourceSystem.gatherNode(targetId);
      if (gatherResult.success && gatherResult.item) {
        this.inventorySystem.addItem(player, gatherResult.item);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: \`Gathered \${gatherResult.item.name}!\` });
      } else {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: gatherResult.reason || "Cannot gather that." });
      }
      this.debouncedSave();
    }`;
content = content.replace(replaceBlock4, newBlock4);

fs.writeFileSync(file, content);
