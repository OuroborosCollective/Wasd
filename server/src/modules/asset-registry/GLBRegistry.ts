// @ARE-GUARD-EXEMPT: non-sim module
import fs from 'fs';
import path from 'path';

export interface GLBLink {
  glbPath: string;
  targetType: 'monster_group' | 'npc_group' | 'npc_single' | 'object_group' | 'object_single';
  targetId: string;
}

export class GLBRegistry {
  private links: Map<string, GLBLink> = new Map();
  private modelsDir = path.resolve(process.cwd(), '../client/public/assets/models');

  constructor() {
    this.loadLinks();
  }

  private loadLinks() {
    const linksPath = path.resolve(process.cwd(), 'game-data/glb-links.json');
    if (fs.existsSync(linksPath)) {
      try {
        const rawLinks: GLBLink[] = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));
        for (const link of rawLinks) {
          this.links.set(`${link.targetType}:${link.targetId}`, link);
        }
      } catch (e) {
        console.error("Failed to parse glb-links.json", e);
      }
    }
  }

  public saveLinks() {
    const linksPath = path.resolve(process.cwd(), 'game-data/glb-links.json');
    fs.mkdirSync(path.dirname(linksPath), { recursive: true });
    const linksArray = Array.from(this.links.values());
    fs.writeFileSync(linksPath, JSON.stringify(linksArray, null, 2));
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
        } else if (file.toLowerCase().endsWith('.glb') || file.toLowerCase().endsWith('.gltf')) {
          models.push('/assets/models/' + path.relative(this.modelsDir, fullPath).replace(/\\/g, '/'));
        }
      }
    };
    scanDir(this.modelsDir);
    return models;
  }

  public saveModel(filename: string, data: Buffer) {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
    const filePath = path.join(this.modelsDir, filename);
    fs.writeFileSync(filePath, data);
    console.log(`Saved GLB model to ${filePath}`);
  }

  public getLinks() {
    return Array.from(this.links.values());
  }

  public addLink(link: GLBLink) {
    this.links.set(`${link.targetType}:${link.targetId}`, link);
    this.saveLinks();
  }

  public removeLink(targetType: string, targetId: string) {
    this.links.delete(`${targetType}:${targetId}`);
    this.saveLinks();
  }

  public getModelForTarget(targetType: string, targetId: string): string | null {
    const link = this.links.get(`${targetType}:${targetId}`);
    return link ? link.glbPath : null;
  }
}
