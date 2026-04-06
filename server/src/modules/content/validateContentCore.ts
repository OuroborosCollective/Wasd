import fs from "node:fs";
import path from "node:path";

export type ContentValidationResult = {
  ok: boolean;
  errors: string[];
  dataDir: string;
};

/**
 * Validates game content under `dataDir` (absolute path to content root with npc/, quests/, etc.).
 * Same rules as `tools/validateContent.ts` CLI.
 */
export function validateContentRoot(dataDir: string): ContentValidationResult {
  const errors: string[] = [];

  const readJson = (rel: string): unknown => {
    const p = path.join(dataDir, rel);
    if (!fs.existsSync(p)) {
      errors.push(`Missing file: ${rel}`);
      return null;
    }
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      errors.push(`Invalid JSON: ${rel}`);
      return null;
    }
  };

  const npcsRaw = readJson("npc/npcs.json");
  const dialoguesRaw = readJson("dialogue/dialogues.json");
  const questsRaw = readJson("quests/quests.json");
  const spawnsRaw = readJson("spawns/npc-spawns.json");
  const itemsRaw = readJson("items/items.json");

  if (errors.length > 0) {
    return { ok: false, errors, dataDir };
  }

  const npcs = npcsRaw as any[];
  const dialogues = dialoguesRaw as any[];
  const quests = questsRaw as any[];
  const spawns = spawnsRaw as any[];
  const items = itemsRaw as any[];

  const checkDuplicate = (arr: any[], type: string) => {
    const ids = new Set<string>();
    arr.forEach((item) => {
      if (ids.has(item.id)) errors.push(`Duplicate ${type} ID: ${item.id}`);
      ids.add(item.id);
    });
    return ids;
  };

  const npcIds = checkDuplicate(npcs, "NPC");
  const dialogueIds = checkDuplicate(dialogues, "Dialogue");
  const questIds = checkDuplicate(quests, "Quest");
  const itemIds = checkDuplicate(items, "Item");

  npcs.forEach((n: any) => {
    if (!dialogueIds.has(n.dialogueId)) errors.push(`NPC ${n.id} references missing dialogue ${n.dialogueId}`);
    if (n.dropTable) {
      n.dropTable.forEach((d: any) => {
        if (typeof d.itemId === "string" && d.itemId.length > 0 && !itemIds.has(d.itemId)) {
          errors.push(`NPC ${n.id} dropTable references missing item ${d.itemId}`);
        }
        const hasGold =
          (typeof d.gold === "number" && d.gold > 0) ||
          (typeof d.goldMin === "number" &&
            typeof d.goldMax === "number" &&
            d.goldMax >= d.goldMin &&
            d.goldMin >= 0);
        if (!hasGold && !(typeof d.itemId === "string" && d.itemId.length > 0)) {
          errors.push(`NPC ${n.id} dropTable entry must have itemId or gold/goldMin+goldMax`);
        }
      });
    }
  });

  quests.forEach((q: any) => {
    if (q.giverNpcId && !npcIds.has(q.giverNpcId)) errors.push(`Quest ${q.id} references missing NPC ${q.giverNpcId}`);
    if (q.reward && q.reward.itemId && !itemIds.has(q.reward.itemId)) errors.push(`Quest ${q.id} references missing item ${q.reward.itemId}`);
    if (q.prerequisiteQuestIds) {
      q.prerequisiteQuestIds.forEach((preId: string) => {
        if (!questIds.has(preId)) errors.push(`Quest ${q.id} references missing prerequisite quest ${preId}`);
      });
    }
  });

  spawns.forEach((region: any) => {
    region.spawns?.forEach((s: any) => {
      if (!npcIds.has(s.npcId)) errors.push(`Spawn references missing NPC ${s.npcId}`);
    });
  });

  dialogues.forEach((d: any) => {
    if (d.nodes) {
      const nodeIds = new Set(Object.keys(d.nodes));
      const visited = new Set<string>(["root"]);
      const queue = ["root"];

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
      nodeIds.forEach((nodeId) => {
        if (!visited.has(nodeId)) errors.push(`Dialogue ${d.id} has unreachable node ${nodeId}`);
      });
    }
  });

  return { ok: errors.length === 0, errors, dataDir };
}
