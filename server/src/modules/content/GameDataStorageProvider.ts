import fs from 'fs';
import path from 'path';
import { resolveContentFile } from './contentDataRoot.js';
import type { NpcLineageStorageProvider } from '../npc/LineageGameDataWriter';

export class GameDataStorageProvider implements NpcLineageStorageProvider {
  read(target: string): string | null {
    const filePath = this.resolve(target);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  }

  write(target: string, content: string): void {
    const filePath = this.resolve(target);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  resolve(target: string): string {
    return resolveContentFile(target);
  }
}
