/**
 * CharacterAssemblySystem
 * Manages modular character creation: body + head + skin/hair/eye colors + body scale.
 * Persists character appearance in PostgreSQL and serves the manifest to clients.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CharacterAppearance {
  gender: 'male' | 'female';
  bodyId: string;
  headId: string;
  skinToneId: string;
  hairColorId: string;
  eyeColorId: string;
  heightScale: number;   // 0.85 – 1.15
  widthScale: number;    // 0.80 – 1.20
  muscularityScale: number; // 0.90 – 1.10
  name: string;
}

export interface CharacterManifest {
  version: string;
  bodies: Record<string, unknown>;
  heads: Record<string, unknown[]>;
  skinTones: unknown[];
  hairColors: unknown[];
  eyeColors: unknown[];
  bodyScales: Record<string, unknown>;
  npcModels: Record<string, unknown>;
}

const DEFAULT_APPEARANCE: CharacterAppearance = {
  gender: 'male',
  bodyId: 'body_male',
  headId: 'head_male_1',
  skinToneId: 'skin_medium',
  hairColorId: 'hair_brown',
  eyeColorId: 'eye_brown',
  heightScale: 1.0,
  widthScale: 1.0,
  muscularityScale: 1.0,
  name: 'Adventurer',
};

export class CharacterAssemblySystem {
  private manifest: CharacterManifest | null = null;
  private manifestPath: string;

  constructor() {
    // __dirname is dist/modules/character/ so we go up 3 levels to server root, then into public
    this.manifestPath = path.resolve(
      __dirname,
      '../../../public/models/characters/character-manifest.json'
    );
  }

  /** Load the character manifest from disk */
  init(): void {
    try {
      const raw = fs.readFileSync(this.manifestPath, 'utf-8');
      this.manifest = JSON.parse(raw) as CharacterManifest;
      console.log('CharacterAssemblySystem: Manifest loaded successfully.');
    } catch (err) {
      console.warn('CharacterAssemblySystem: Could not load manifest, using defaults.', err);
      this.manifest = null;
    }
  }

  /** Return the full manifest for the client */
  getManifest(): CharacterManifest | null {
    return this.manifest;
  }

  /** Validate and sanitize a CharacterAppearance object */
  validateAppearance(raw: Partial<CharacterAppearance>): CharacterAppearance {
    const manifest = this.manifest;
    const appearance: CharacterAppearance = { ...DEFAULT_APPEARANCE, ...raw };

    // Validate gender
    if (!['male', 'female'].includes(appearance.gender)) {
      appearance.gender = 'male';
    }

    // Validate body
    if (manifest) {
      const validBodies = Object.keys(manifest.bodies);
      if (!validBodies.includes(appearance.bodyId)) {
        appearance.bodyId = appearance.gender === 'female' ? 'body_female' : 'body_male';
      }

      // Validate head
      const validHeads = (manifest.heads[appearance.gender] as Array<{ id: string }>) || [];
      if (!validHeads.find(h => h.id === appearance.headId)) {
        appearance.headId = validHeads[0]?.id ?? 'head_male_1';
      }

      // Validate skin tone
      const validSkins = (manifest.skinTones as Array<{ id: string }>).map(s => s.id);
      if (!validSkins.includes(appearance.skinToneId)) {
        appearance.skinToneId = 'skin_medium';
      }

      // Validate hair color
      const validHair = (manifest.hairColors as Array<{ id: string }>).map(h => h.id);
      if (!validHair.includes(appearance.hairColorId)) {
        appearance.hairColorId = 'hair_brown';
      }

      // Validate eye color
      const validEyes = (manifest.eyeColors as Array<{ id: string }>).map(e => e.id);
      if (!validEyes.includes(appearance.eyeColorId)) {
        appearance.eyeColorId = 'eye_brown';
      }
    }

    // Clamp scale values
    appearance.heightScale = Math.max(0.85, Math.min(1.15, appearance.heightScale || 1.0));
    appearance.widthScale = Math.max(0.80, Math.min(1.20, appearance.widthScale || 1.0));
    appearance.muscularityScale = Math.max(0.90, Math.min(1.10, appearance.muscularityScale || 1.0));

    // Sanitize name
    appearance.name = (appearance.name || 'Adventurer').slice(0, 24).replace(/[^a-zA-Z0-9_\- äöüÄÖÜß]/g, '');
    if (!appearance.name.trim()) appearance.name = 'Adventurer';

    return appearance;
  }

  /** Build the model URL paths for a given appearance */
  resolveModelPaths(appearance: CharacterAppearance): {
    bodyUrl: string;
    headUrl: string;
    skinColor: string;
    hairColor: string;
    eyeColor: string;
  } {
    const manifest = this.manifest;
    let bodyUrl = `/models/characters/bodies/Body_${appearance.gender}.glb`;
    let headUrl = `/models/characters/heads/Head_${appearance.gender === 'male' ? 'male' : 'female'}1.glb`;

    if (manifest) {
      const body = (manifest.bodies as Record<string, { file: string }>)[appearance.gender];
      if (body) bodyUrl = body.file;

      const heads = (manifest.heads[appearance.gender] as Array<{ id: string; file: string }>) || [];
      const head = heads.find(h => h.id === appearance.headId);
      if (head) headUrl = head.file;
    }

    const skinTone = manifest
      ? (manifest.skinTones as Array<{ id: string; color: string }>).find(s => s.id === appearance.skinToneId)
      : null;
    const hairColor = manifest
      ? (manifest.hairColors as Array<{ id: string; color: string }>).find(h => h.id === appearance.hairColorId)
      : null;
    const eyeColor = manifest
      ? (manifest.eyeColors as Array<{ id: string; color: string }>).find(e => e.id === appearance.eyeColorId)
      : null;

    return {
      bodyUrl,
      headUrl,
      skinColor: skinTone?.color ?? '#D4956A',
      hairColor: hairColor?.color ?? '#6B3A2A',
      eyeColor: eyeColor?.color ?? '#6B3A2A',
    };
  }

  /** Get NPC model URL by type */
  getNPCModelUrl(npcType: string): string | null {
    if (!this.manifest) return null;
    const npc = (this.manifest.npcModels as Record<string, { file: string }>)[npcType];
    return npc?.file ?? null;
  }

  /** Assign random appearance variation for NPC characters */
  generateNPCAppearance(gender: 'male' | 'female' = 'male', name: string = 'NPC'): CharacterAppearance {
    const manifest = this.manifest;
    const skinTones = manifest
      ? (manifest.skinTones as Array<{ id: string }>).map(s => s.id)
      : ['skin_medium'];
    const hairColors = manifest
      ? (manifest.hairColors as Array<{ id: string }>).map(h => h.id)
      : ['hair_brown'];
    const eyeColors = manifest
      ? (manifest.eyeColors as Array<{ id: string }>).map(e => e.id)
      : ['eye_brown'];
    const heads = manifest
      ? (manifest.heads[gender] as Array<{ id: string }>).map(h => h.id)
      : [gender === 'male' ? 'head_male_1' : 'head_female_1'];

    const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    return {
      gender,
      bodyId: gender === 'female' ? 'body_female' : 'body_male',
      headId: rand(heads),
      skinToneId: rand(skinTones),
      hairColorId: rand(hairColors),
      eyeColorId: rand(eyeColors),
      heightScale: 0.95 + Math.random() * 0.10,
      widthScale: 0.90 + Math.random() * 0.20,
      muscularityScale: 0.90 + Math.random() * 0.20,
      name,
    };
  }
}

export const characterAssembly = new CharacterAssemblySystem();
