/**
 * Areloria Game Assets - Deterministic Sprite Manifest
 * 
 * Naming Convention:
 * {category}_{race}_{gender}_{direction}_{animation}[_f{framenum}].png
 * 
 * Categories: character, npc, monster, effect, biome, weather, symbol, ui
 * Races: human, elf, halfelf, dwarf, halfling, gnome, orc, darkelf, woodelf
 * Genders: male, female
 * Directions: n, ne, e, se, s, sw, w, nw
 * Animations: idle, walk, run, attack, defend, talk, sleep, die
 */

export const SPRITE_DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type Direction = typeof SPRITE_DIRECTIONS[number];

export const ANIMATION_TYPES = ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'] as const;
export type AnimationType = typeof ANIMATION_TYPES[number];

export const CHARACTER_RACES = ['human', 'elf', 'halfelf', 'dwarf', 'halfling', 'gnome', 'orc', 'darkelf', 'woodelf'] as const;
export type CharacterRace = typeof CHARACTER_RACES[number];

export const CHARACTER_GENDERS = ['male', 'female'] as const;
export type CharacterGender = typeof CHARACTER_GENDERS[number];

export interface CharacterSpriteInfo {
  id: string;
  className: string;
  race: CharacterRace;
  gender: CharacterGender;
  basePath: string;
  spriteSize: number;
  frameCount: number;
  animations: AnimationType[];
  availableDirections: Direction[];
  /** Optional flow/cropped sprite path for UI usage */
  flowPath?: string;
}

export interface SpriteFrameInfo {
  path: string;
  frame: number;
  duration: number;
}

export interface AnimationSequence {
  characterId: string;
  animation: AnimationType;
  direction: Direction;
  frames: SpriteFrameInfo[];
  totalDuration: number;
}

/**
 * NPC Flow Sprite Info - Processed Stitch sprites with transparent backgrounds
 */
export interface NpcFlowSpriteInfo {
  id: string;
  originalPath: string;
  flowPath: string;
  cropWidth: number;
  cropHeight: number;
  cropLeft: number;
  cropTop: number;
}

// NPC Flow Sprites - Processed from Stitch with transparent backgrounds
export const NPC_FLOW_SPRITES: Record<string, NpcFlowSpriteInfo> = {
  warrior_human_male_e_idle: {
    id: 'warrior_human_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/warrior_human_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/warrior_human_male_e_idle_flow.png',
    cropWidth: 369,
    cropHeight: 428,
    cropLeft: 34,
    cropTop: 49
  },
  mage_elf_female_e_idle: {
    id: 'mage_elf_female_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/mage_elf_female_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/mage_elf_female_e_idle_flow.png',
    cropWidth: 291,
    cropHeight: 453,
    cropLeft: 110,
    cropTop: 30
  },
  archer_dwarf_male_e_idle: {
    id: 'archer_dwarf_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/archer_dwarf_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/archer_dwarf_male_e_idle_flow.png',
    cropWidth: 512,
    cropHeight: 512,
    cropLeft: 0,
    cropTop: 0
  },
  rogue_halfling_female_e_idle: {
    id: 'rogue_halfling_female_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/rogue_halfling_female_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/rogue_halfling_female_e_idle_flow.png',
    cropWidth: 436,
    cropHeight: 426,
    cropLeft: 40,
    cropTop: 48
  },
  cleric_human_male_e_idle: {
    id: 'cleric_human_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/cleric_human_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/cleric_human_male_e_idle_flow.png',
    cropWidth: 512,
    cropHeight: 512,
    cropLeft: 0,
    cropTop: 0
  },
  ranger_woodelf_female_e_idle: {
    id: 'ranger_woodelf_female_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/ranger_woodelf_female_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/ranger_woodelf_female_e_idle_flow.png',
    cropWidth: 455,
    cropHeight: 483,
    cropLeft: 38,
    cropTop: 14
  },
  paladin_human_male_e_idle: {
    id: 'paladin_human_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/paladin_human_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/paladin_human_male_e_idle_flow.png',
    cropWidth: 512,
    cropHeight: 379,
    cropLeft: 0,
    cropTop: 133
  },
  necromancer_darkelf_female_e_idle: {
    id: 'necromancer_darkelf_female_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/necromancer_darkelf_female_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/necromancer_darkelf_female_e_idle_flow.png',
    cropWidth: 343,
    cropHeight: 482,
    cropLeft: 95,
    cropTop: 12
  },
  berserker_human_male_e_idle: {
    id: 'berserker_human_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/berserker_human_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/berserker_human_male_e_idle_flow.png',
    cropWidth: 512,
    cropHeight: 512,
    cropLeft: 0,
    cropTop: 0
  },
  bard_gnome_male_e_idle: {
    id: 'bard_gnome_male_e_idle',
    originalPath: '/2d-assets/game-assets/models/characters/bard_gnome_male_e_idle.png',
    flowPath: '/2d-assets/game-assets/models/npc-flow/bard_gnome_male_e_idle_flow.png',
    cropWidth: 307,
    cropHeight: 404,
    cropLeft: 110,
    cropTop: 62
  }
};

/**
 * Get NPC flow sprite info by character ID
 */
export function getNpcFlowSprite(characterId: string): NpcFlowSpriteInfo | undefined {
  return NPC_FLOW_SPRITES[characterId];
}

/**
 * Deterministic sprite path generator
 * 
 * @example
 * // Generate path for warrior facing east, idle animation, frame 1
 * const path = getSpritePath('warrior', 'human', 'male', 'e', 'idle', 1);
 * // Returns: 'models/characters/warrior_human_male_e_idle_f01.png'
 */
export function getSpritePath(
  className: string,
  race: CharacterRace,
  gender: CharacterGender,
  direction: Direction,
  animation: AnimationType,
  frame?: number
): string {
  const base = `${className.toLowerCase()}_${race.toLowerCase()}_${gender.toLowerCase()}_${direction}_${animation}`;
  if (frame !== undefined) {
    return `models/characters/${base}_f${String(frame).padStart(2, '0')}.png`;
  }
  return `models/characters/${base}.png`;
}

/**
 * Get spritesheet path (for 30-frame animation sheets)
 */
export function getSpritesheetPath(
  className: string,
  race: CharacterRace,
  gender: CharacterGender,
  direction: Direction,
  animation: AnimationType
): string {
  const base = `${className.toLowerCase()}_${race.toLowerCase()}_${gender.toLowerCase()}_${direction}_${animation}`;
  return `models/characters/${base}.png`;
}

/**
 * Get JSON spritesheet metadata path
 */
export function getSpritesheetMetaPath(
  className: string,
  race: CharacterRace,
  gender: CharacterGender,
  direction: Direction,
  animation: AnimationType
): string {
  const base = `${className.toLowerCase()}_${race.toLowerCase()}_${gender.toLowerCase()}_${direction}_${animation}`;
  return `models/characters/${base}.json`;
}

// Pre-defined character roster
export const CHARACTER_ROSTER: Record<string, CharacterSpriteInfo> = {
  warrior: {
    id: 'warrior',
    className: 'Warrior',
    race: 'human',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/warrior_human_male_e_idle_flow.png'
  },
  mage: {
    id: 'mage',
    className: 'Mage',
    race: 'elf',
    gender: 'female',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/mage_elf_female_e_idle_flow.png'
  },
  archer: {
    id: 'archer',
    className: 'Archer',
    race: 'dwarf',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/archer_dwarf_male_e_idle_flow.png'
  },
  rogue: {
    id: 'rogue',
    className: 'Rogue',
    race: 'halfling',
    gender: 'female',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/rogue_halfling_female_e_idle_flow.png'
  },
  cleric: {
    id: 'cleric',
    className: 'Cleric',
    race: 'human',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/cleric_human_male_e_idle_flow.png'
  },
  ranger: {
    id: 'ranger',
    className: 'Ranger',
    race: 'woodelf',
    gender: 'female',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/ranger_woodelf_female_e_idle_flow.png'
  },
  paladin: {
    id: 'paladin',
    className: 'Paladin',
    race: 'human',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/paladin_human_male_e_idle_flow.png'
  },
  necromancer: {
    id: 'necromancer',
    className: 'Necromancer',
    race: 'darkelf',
    gender: 'female',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/necromancer_darkelf_female_e_idle_flow.png'
  },
  berserker: {
    id: 'berserker',
    className: 'Berserker',
    race: 'human',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/berserker_human_male_e_idle_flow.png'
  },
  bard: {
    id: 'bard',
    className: 'Bard',
    race: 'gnome',
    gender: 'male',
    basePath: 'models/characters',
    spriteSize: 256,
    frameCount: 30,
    animations: ['idle', 'walk', 'run', 'attack', 'defend', 'talk', 'sleep', 'die'],
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'],
    flowPath: 'models/npc-flow/bard_gnome_male_e_idle_flow.png'
  }
};

// Asset manifest for the Stitch importer
export const ASSET_MANIFEST = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  projectId: '15403920134461014850',
  designSystemId: '395d7882b73a41c2b789f06cdb3ae868',
  spriteSpecifications: {
    size: 256,
    format: 'png',
    transparency: true,
    directions: 8,
    framesPerAnimation: 30
  },
  characters: Object.values(CHARACTER_ROSTER).map(char => ({
    id: char.id,
    className: char.className,
    race: char.race,
    gender: char.gender,
    spritePathPattern: `${char.basePath}/${char.id}_{race}_{gender}_{direction}_{animation}.png`,
    flowPath: char.flowPath ? `/2d-assets/game-assets/${char.flowPath}` : null
  })),
  npcFlowSprites: Object.values(NPC_FLOW_SPRITES).map(sprite => ({
    id: sprite.id,
    originalPath: sprite.originalPath,
    flowPath: sprite.flowPath,
    dimensions: {
      width: sprite.cropWidth,
      height: sprite.cropHeight,
      offsetX: sprite.cropLeft,
      offsetY: sprite.cropTop
    }
  }))
};