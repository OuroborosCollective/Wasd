import fs from 'fs';
import path from 'path';

interface GLBLink {
  glbPath: string;
  targetType: 'monster_group' | 'npc_group' | 'npc_single' | 'object_group' | 'object_single';
  targetId: string;
}

const getGameData = (file: string) => {
  const p = path.resolve(process.cwd(), '../game-data', file);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return null;
}

const main = () => {
  const glbLinks: GLBLink[] = getGameData('glb-links.json');
  const npcs = getGameData('npc/npcs.json');
  const items = getGameData('items/items.json');

  for (const link of glbLinks) {
    const glbPath = path.resolve(process.cwd(), '../client/public', link.glbPath.slice(1));
    if (!fs.existsSync(glbPath)) {
      throw new Error(`GLB file not found: ${link.glbPath}`);
    }

    let targetFound = false;
    if (link.targetType === 'npc_single' || link.targetType === 'monster_group') {
      targetFound = npcs.some((npc: any) => npc.id === link.targetId);
    } else if (link.targetType === 'object_single') {
      targetFound = items.some((item: any) => item.id === link.targetId);
    }

    if (!targetFound) {
      throw new Error(`Target ID not found for ${link.targetType}: ${link.targetId}`);
    }
  }

  console.log('All GLB assets are correctly linked!');
};

main();
