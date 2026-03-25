import fs from 'fs';
import path from 'path';

export interface StyleProperties {
  palette: string[]; // Hex codes or identifiers
  materialModifier: string; // e.g., 'faded', 'metallic'
  decal: string | null; // e.g., 'redfalcon_emblem', null if none
  conditionOverlay: string; // e.g., 'dirt_noise', 'moss_noise'
  meshVariant: string; // e.g., 'base', 'broken', 'fortified'
}

export class StyleMatrixParser {
  private biomesData: Record<string, any> = {};
  private historyData: Record<string, any> = {};
  private factionsData: Record<string, any> = {};
  private conditionsData: Record<string, any> = {};

  constructor(dataDirectory: string) {
    this.loadData(dataDirectory);
  }

  private loadData(dir: string) {
    try {
      if (fs.existsSync(path.join(dir, 'biomes.json'))) {
        this.biomesData = JSON.parse(fs.readFileSync(path.join(dir, 'biomes.json'), 'utf-8'));
      }
      if (fs.existsSync(path.join(dir, 'history.json'))) {
        this.historyData = JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf-8'));
      }
      if (fs.existsSync(path.join(dir, 'factions.json'))) {
        this.factionsData = JSON.parse(fs.readFileSync(path.join(dir, 'factions.json'), 'utf-8'));
      }
      if (fs.existsSync(path.join(dir, 'conditions.json'))) {
        this.conditionsData = JSON.parse(fs.readFileSync(path.join(dir, 'conditions.json'), 'utf-8'));
      }
    } catch (e) {
      console.warn("StyleMatrixParser: Could not load some or all style matrix JSON files.");
    }
  }

  /**
   * Parses a Style Key (e.g., 'desert_ancient_redfalcon_ruined')
   * into rendering properties based on loaded JSON data.
   */
  public parseKey(styleKey: string): StyleProperties {
    const parts = styleKey.split('_');
    if (parts.length !== 4) {
      throw new Error(`Invalid Style Key format: ${styleKey}. Expected [Biome]_[HistoricalLayer]_[Faction]_[Condition]`);
    }

    const [biome, history, faction, condition] = parts;

    // Default fallback values
    const result: StyleProperties = {
      palette: ['#FFFFFF'],
      materialModifier: 'default',
      decal: null,
      conditionOverlay: 'none',
      meshVariant: 'base'
    };

    // Apply Biome
    if (this.biomesData[biome]) {
       result.palette = this.biomesData[biome].palette || result.palette;
    }

    // Apply Historical Layer
    if (this.historyData[history]) {
       result.materialModifier = this.historyData[history].materialModifier || result.materialModifier;
    }

    // Apply Faction
    if (faction !== 'independent' && faction !== 'none' && this.factionsData[faction]) {
       result.decal = this.factionsData[faction].decal || null;
       // Factions might inject an accent color into the palette
       if (this.factionsData[faction].accentColor) {
           result.palette.push(this.factionsData[faction].accentColor);
       }
    }

    // Apply Condition
    if (this.conditionsData[condition]) {
       result.conditionOverlay = this.conditionsData[condition].overlay || result.conditionOverlay;
       result.meshVariant = this.conditionsData[condition].meshVariant || result.meshVariant;
    }

    return result;
  }
}
