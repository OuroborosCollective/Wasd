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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
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
    availableDirections: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  }
};

// Asset manifest for the Stitch importer
export const ASSET_MANIFEST = {
  version: '1.0.0',
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
    spritePathPattern: `${char.basePath}/${char.id}_{race}_{gender}_{direction}_{animation}.png`
  }))
};