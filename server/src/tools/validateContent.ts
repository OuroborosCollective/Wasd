import fs from 'fs';
import path from 'path';

function validate() {
  const dataDir = path.resolve(process.cwd(), '..', 'game-data');
  
  const npcs = JSON.parse(fs.readFileSync(path.join(dataDir, 'npc/npcs.json'), 'utf-8'));
  const dialogues = JSON.parse(fs.readFileSync(path.join(dataDir, 'dialogue/dialogues.json'), 'utf-8'));
  const quests = JSON.parse(fs.readFileSync(path.join(dataDir, 'quests/quests.json'), 'utf-8'));
  const spawns = JSON.parse(fs.readFileSync(path.join(dataDir, 'spawns/npc-spawns.json'), 'utf-8'));
  const items = JSON.parse(fs.readFileSync(path.join(dataDir, 'items/items.json'), 'utf-8'));

  const errors: string[] = [];
  const checkDuplicate = (arr: any[], type: string) => {
    const ids = new Set();
    arr.forEach(item => {
      if (ids.has(item.id)) errors.push(`Duplicate ${type} ID: ${item.id}`);
      ids.add(item.id);
    });
    return ids;
  };

  const npcIds = checkDuplicate(npcs, 'NPC');
  const dialogueIds = checkDuplicate(dialogues, 'Dialogue');
  const questIds = checkDuplicate(quests, 'Quest');
  const itemIds = checkDuplicate(items, 'Item');

  // NPC -> Dialogue
  npcs.forEach((n: any) => {
    if (!dialogueIds.has(n.dialogueId)) errors.push(`NPC ${n.id} references missing dialogue ${n.dialogueId}`);
    if (n.dropTable) {
      n.dropTable.forEach((d: any) => {
        if (!itemIds.has(d.itemId)) errors.push(`NPC ${n.id} dropTable references missing item ${d.itemId}`);
      });
    }
  });

  // Quest -> NPC/Item/Quest
  quests.forEach((q: any) => {
    if (q.giverNpcId && !npcIds.has(q.giverNpcId)) errors.push(`Quest ${q.id} references missing NPC ${q.giverNpcId}`);
    if (q.reward && q.reward.itemId && !itemIds.has(q.reward.itemId)) errors.push(`Quest ${q.id} references missing item ${q.reward.itemId}`);
    if (q.prerequisiteQuestIds) {
      q.prerequisiteQuestIds.forEach((preId: string) => {
        if (!questIds.has(preId)) errors.push(`Quest ${q.id} references missing prerequisite quest ${preId}`);
      });
    }
  });

  // Spawn -> NPC
  spawns.forEach((region: any) => {
    region.spawns.forEach((s: any) => {
      if (!npcIds.has(s.npcId)) errors.push(`Spawn references missing NPC ${s.npcId}`);
    });
  });

  // Dialogue -> NextNode & Reachability
  dialogues.forEach((d: any) => {
    if (d.nodes) {
      const nodeIds = new Set(Object.keys(d.nodes));
      const visited = new Set(['root']);
      const queue = ['root'];

      if (d.entryNodes) {
        d.entryNodes.forEach((en: any) => {
          if (nodeIds.has(en.nodeId)) {
            visited.add(en.nodeId);
            queue.push(en.nodeId);
          }
        });
      }

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const node = d.nodes[nodeId];
        if (node && node.choices) {
          node.choices.forEach((c: any) => {
            if (c.nextNodeId) {
              if (!nodeIds.has(c.nextNodeId)) errors.push(`Dialogue ${d.id} references missing node ${c.nextNodeId}`);
              else if (!visited.has(c.nextNodeId)) {
                visited.add(c.nextNodeId);
                queue.push(c.nextNodeId);
              }
            }
          });
        }
      }
      nodeIds.forEach(nodeId => {
        if (!visited.has(nodeId)) errors.push(`Dialogue ${d.id} has unreachable node ${nodeId}`);
      });
    }
  });

  if (errors.length > 0) {
    console.error('Validation failed:');
    errors.forEach(e => console.error(` - ${e}`));
    process.exit(1);
  } else {
    console.log('Validation passed!');
    
    // Generate manifest
    const manifest = {
      contentPacks: [
        {
          name: "Core Content",
          npcIds: Array.from(npcIds),
          questIds: Array.from(questIds),
          dialogueIds: Array.from(dialogueIds),
          itemIds: Array.from(itemIds),
          validationResult: "passed"
        }
      ]
    };
    fs.writeFileSync(path.join(dataDir, 'content-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('Manifest generated.');
  }
}

validate();
