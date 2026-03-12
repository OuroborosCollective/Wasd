import fs from 'fs';
import path from 'path';

export interface GLBLink {
  glbPath: string;
  targetType: 'monster_group' | 'npc_group' | 'npc_single' | 'object_group' | 'object_single';
  targetId: string;
}

export class GLBRegistry {
  private links: GLBLink[] = [];
  private modelsDir = path.resolve(process.cwd(), '../client/public/assets/models');

  constructor() {
    this.loadLinks();
  }

  private loadLinks() {
    const linksPath = path.resolve(process.cwd(), 'game-data/glb-links.json');
    if (fs.existsSync(linksPath)) {
      try {
        this.links = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));
      } catch (e) {
        console.error("Failed to parse glb-links.json", e);
        this.links = [];
      }
    }
  }

  public saveLinks() {
    const linksPath = path.resolve(process.cwd(), 'game-data/glb-links.json');
    fs.mkdirSync(path.dirname(linksPath), { recursive: true });
    fs.writeFileSync(linksPath, JSON.stringify(this.links, null, 2));
  }

  public scanModels(): string[] {
    const models: string[] = [];
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.glb')) {
          models.push('/assets/models/' + path.relative(this.modelsDir, fullPath).replace(/\\/g, '/'));
        }
      }
    };
    scanDir(this.modelsDir);
    return models;
  }

  public getLinks() {
    return this.links;
  }

  public addLink(link: GLBLink) {
    // remove existing link for the same target
    this.links = this.links.filter(l => !(l.targetType === link.targetType && l.targetId === link.targetId));
    this.links.push(link);
    this.saveLinks();
  }

  public removeLink(targetType: string, targetId: string) {
    this.links = this.links.filter(l => !(l.targetType === targetType && l.targetId === targetId));
    this.saveLinks();
  }

  public getModelForTarget(targetType: string, targetId: string): string | null {
    const link = this.links.find(l => l.targetType === targetType && l.targetId === targetId);
    return link ? link.glbPath : null;
  }
}
