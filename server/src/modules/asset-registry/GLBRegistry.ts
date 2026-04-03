import fs from "fs";
import path from "path";
import { resolveContentFile } from "../content/contentDataRoot.js";
import type { GlbLinksSpacetimeBackend } from "../spacetime/glbLinksSpacetimeBackend.js";

export interface GLBLink {
  glbPath: string;
  targetType: "monster_group" | "npc_group" | "npc_single" | "object_group" | "object_single";
  targetId: string;
}

export type GLBRegistryOptions = {
  /** When set, link list is loaded from SpacetimeDB at init() and persisted there on change. */
  glbLinksSpacetime?: GlbLinksSpacetimeBackend | null;
};

export class GLBRegistry {
  private links: GLBLink[] = [];
  private readonly modelsDir = path.resolve(process.cwd(), "../client/public/assets/models");
  private readonly spacetime: GlbLinksSpacetimeBackend | null;

  constructor(options?: GLBRegistryOptions) {
    this.spacetime = options?.glbLinksSpacetime ?? null;
    if (!this.spacetime) {
      this.loadLinksFromFile();
    }
  }

  /**
   * Call once at server startup when using SpacetimeDB for GLB links.
   */
  async init(): Promise<void> {
    if (!this.spacetime) return;
    try {
      this.links = await this.spacetime.loadAll();
      console.log(`[GLBRegistry] Loaded ${this.links.length} GLB link(s) from SpacetimeDB`);
    } catch (e) {
      console.error("[GLBRegistry] Spacetime load failed; GLB overrides empty until fixed:", e);
      this.links = [];
    }
    this.mergeFileLinksIfEnabled();
  }

  /**
   * When Spacetime is active, merge in `glb-links.json` for targets not present in DB.
   * Disable with GLB_LINKS_MERGE_FILE=0 if Spacetime should be the only source.
   */
  private mergeFileLinksIfEnabled() {
    if (!this.spacetime) return;
    if (process.env.GLB_LINKS_MERGE_FILE?.trim() === "0") return;
    const before = this.links.length;
    const fileLinks = this.readLinksFromFile();
    if (fileLinks.length === 0) return;
    const key = (l: GLBLink) => `${l.targetType}\0${l.targetId}`;
    const seen = new Set(this.links.map(key));
    let added = 0;
    for (const l of fileLinks) {
      if (!seen.has(key(l))) {
        this.links.push(l);
        seen.add(key(l));
        added++;
      }
    }
    if (added > 0) {
      console.log(
        `[GLBRegistry] Merged ${added} GLB link(s) from glb-links.json (${before} from Spacetime → ${this.links.length} total)`
      );
    }
  }

  private readLinksFromFile(): GLBLink[] {
    const linksPath = resolveContentFile("glb-links.json");
    if (!fs.existsSync(linksPath)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(linksPath, "utf-8"));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private loadLinksFromFile() {
    const linksPath = resolveContentFile("glb-links.json");
    if (!fs.existsSync(linksPath)) {
      this.links = [];
      return;
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(linksPath, "utf-8"));
      this.links = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse glb-links.json", e);
      this.links = [];
    }
  }

  private saveLinksToFile() {
    const linksPath = resolveContentFile("glb-links.json");
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
        } else if (file.endsWith(".glb")) {
          models.push("/assets/models/" + path.relative(this.modelsDir, fullPath).replace(/\\/g, "/"));
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
    return this.links;
  }

  public async addLink(link: GLBLink): Promise<void> {
    this.links = this.links.filter((l) => !(l.targetType === link.targetType && l.targetId === link.targetId));
    this.links.push(link);
    if (this.spacetime) {
      await this.spacetime.upsert(link);
    } else {
      this.saveLinksToFile();
    }
  }

  public async removeLink(targetType: string, targetId: string): Promise<void> {
    this.links = this.links.filter((l) => !(l.targetType === targetType && l.targetId === targetId));
    if (this.spacetime) {
      await this.spacetime.remove(targetType, targetId);
    } else {
      this.saveLinksToFile();
    }
  }

  public getModelForTarget(targetType: string, targetId: string): string | null {
    const link = this.links.find((l) => l.targetType === targetType && l.targetId === targetId);
    return link ? link.glbPath : null;
  }
}
