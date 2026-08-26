/**
 * Deterministic NPC Portrait System
 * 
 * Generates visually matching portraits for NPCs based on their role/race/gender
 * without hardcoded values. Uses deterministic hash from NPC properties.
 * 
 * Portrait Style: Diablo 4 cinematic quality - stylized fantasy characters with
 * dramatic lighting, detailed armor/clothing, and expressive features.
 */

import type { NpcRole } from "@wasd/shared";

// NPC Role to Visual Category mapping (deterministic, no random)
export type NpcVisualCategory = 
  | "elder_sage"
  | "blacksmith_crafter"
  | "merchant_trader"
  | "healer_mystic"
  | "guard_warrior"
  | "farmer_laborer"
  | "hunter_ranger"
  | "child_young"
  | "innkeeper_barkeep"
  | "carpenter_builder"
  | "wandering_merchant"
  | "animal_beast"
  | "generic_npc";

// Race types for visual variation
export type NpcRace = "human" | "elf" | "dwarf" | "orc" | "beast";

// Gender for visual variation
export type NpcGender = "male" | "female" | "neutral";

// Deterministic hash function for consistent NPC visuals
function deterministicHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministic01(seed: string): number {
  return deterministicHash(seed) / 0xffffffff;
}

// Map NPC role to visual category
export function getVisualCategory(role: NpcRole | string): NpcVisualCategory {
  const roleMap: Record<string, NpcVisualCategory> = {
    elder: "elder_sage",
    blacksmith: "blacksmith_crafter",
    trader: "merchant_trader",
    healer: "healer_mystic",
    guard_captain: "guard_warrior",
    guard: "guard_warrior",
    farmer: "farmer_laborer",
    hunter: "hunter_ranger",
    child: "child_young",
    innkeeper: "innkeeper_barkeep",
    carpenter: "carpenter_builder",
    wandering_merchant: "wandering_merchant",
    animal: "animal_beast",
  };
  return roleMap[role] ?? "generic_npc";
}

// Get visual traits based on deterministic seed
export interface NpcVisualTraits {
  readonly category: NpcVisualCategory;
  readonly race: NpcRace;
  readonly gender: NpcGender;
  readonly skinTone: string;      // Hex color
  readonly hairColor: string;     // Hex color
  readonly hairStyle: number;     // Index 0-7
  readonly clothingPrimary: string; // Hex color
  readonly clothingSecondary: string;
  readonly armorLevel: number;    // 0-3 (none, light, medium, heavy)
  readonly hasCape: boolean;
  readonly hasHood: boolean;
  readonly expression: "neutral" | "happy" | "serious" | "mysterious";
  readonly accessoryType: "none" | "hat" | "circlet" | "scarf" | "mask" | "tattoo";
  readonly weaponType: "none" | "sword" | "staff" | "bow" | "axe" | "shield" | "dagger" | "hammer";
  readonly backgroundColor: string; // Hex color for portrait bg
  readonly lightingColor: string;   // Hex color for dramatic lighting
  readonly frameStyle: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

// Human skin tones (Diablo-inspired)
const SKIN_TONES = [
  "#E8B89D", // Light
  "#D4A574", // Fair
  "#C68E5A", // Medium
  "#A67449", // Tan
  "#8B5A3C", // Brown
  "#6B4423", // Dark
  "#4A2F1A", // Deep
];

// Hair colors
const HAIR_COLORS = [
  "#1A1A1A", // Black
  "#3D2314", // Dark Brown
  "#6B4423", // Brown
  "#B8860B", // Golden
  "#C41E3A", // Crimson
  "#E8E8E8", // Silver/White
  "#4A4A4A", // Gray
  "#8B4513", // Auburn
];

// Clothing colors by category
const CLOTHING_BY_CATEGORY: Record<NpcVisualCategory, [string, string][]> = {
  elder_sage: [["#4A4A6A", "#6B6B8B"], ["#2F2F4F", "#4F4F7F"], ["#3D3D5C", "#5D5D8C"]],
  blacksmith_crafter: [["#8B4513", "#654321"], ["#4A4A4A", "#6B6B6B"], ["#5C4033", "#7B5B43"]],
  merchant_trader: [["#8B6914", "#A67C00"], ["#4A7B4A", "#6B9B6B"], ["#6B5B4A", "#8B7B6A"]],
  healer_mystic: [["#E8E8E8", "#FFFFFF"], ["#87CEEB", "#ADD8E6"], ["#E6E6FA", "#DCD0FF"]],
  guard_warrior: [["#4169E1", "#6495ED"], ["#8B0000", "#A52A2A"], ["#2F4F4F", "#4F6F6F"]],
  farmer_laborer: [["#8B7355", "#A89078"], ["#9B8B7B", "#BCA894"], ["#7B6B5B", "#9B8B7B"]],
  hunter_ranger: [["#228B22", "#3CB371"], ["#556B2F", "#6B8E23"], ["#2E8B57", "#3CB371"]],
  child_young: [["#FFE4C4", "#FFDAB9"], ["#E8C8A8", "#F5DEB3"], ["#D4A574", "#E8C8A8"]],
  innkeeper_barkeep: [["#CD853F", "#DEB887"], ["#B8860B", "#DAA520"], ["#A0522D", "#C47241"]],
  carpenter_builder: [["#8B4513", "#A0522D"], ["#696969", "#808080"], ["#5C4033", "#7B5B43"]],
  wandering_merchant: [["#9932CC", "#BA55D3"], ["#8B008B", "#A020A0"], ["#800080", "#9932CC"]],
  animal_beast: [["#8B7355", "#A89078"], ["#4A4A4A", "#6B6B6B"], ["#2F2F2F", "#4F4F4F"]],
  generic_npc: [["#6B6B6B", "#8B8B8B"], ["#5B5B5B", "#7B7B7B"], ["#4B4B4B", "#6B6B6B"]],
};

// Armor levels by category
const ARMOR_BY_CATEGORY: Record<NpcVisualCategory, number> = {
  elder_sage: 0,
  blacksmith_crafter: 1,
  merchant_trader: 0,
  healer_mystic: 1,
  guard_warrior: 3,
  farmer_laborer: 0,
  hunter_ranger: 1,
  child_young: 0,
  innkeeper_barkeep: 0,
  carpenter_builder: 1,
  wandering_merchant: 1,
  animal_beast: 0,
  generic_npc: 0,
};

// Weapon types by category
const WEAPON_BY_CATEGORY: Record<NpcVisualCategory, NpcVisualTraits["weaponType"]> = {
  elder_sage: "staff",
  blacksmith_crafter: "hammer",
  merchant_trader: "dagger",
  healer_mystic: "staff",
  guard_warrior: "sword",
  farmer_laborer: "none",
  hunter_ranger: "bow",
  child_young: "none",
  innkeeper_barkeep: "none",
  carpenter_builder: "axe",
  wandering_merchant: "dagger",
  animal_beast: "none",
  generic_npc: "none",
};

// Generate deterministic visual traits for an NPC
export function generateVisualTraits(npcId: string, role: NpcRole | string, npcSeed?: string): NpcVisualTraits {
  const seed = npcSeed ?? npcId;
  const category = getVisualCategory(role);
  
  // Deterministic random values from NPC ID + role
  const skinIdx = Math.floor(deterministic01(`${seed}:skin`) * SKIN_TONES.length);
  const hairIdx = Math.floor(deterministic01(`${seed}:hair`) * HAIR_COLORS.length);
  const clothIdx = Math.floor(deterministic01(`${seed}:cloth`) * 3);
  const styleIdx = Math.floor(deterministic01(`${seed}:style`) * 8);
  const genderIdx = Math.floor(deterministic01(`${seed}:gender`) * 3);
  const raceIdx = Math.floor(deterministic01(`${seed}:race`) * 4);
  const hasCape = deterministic01(`${seed}:cape`) > 0.5;
  const hasHood = deterministic01(`${seed}:hood`) > 0.7;
  const expressionIdx = Math.floor(deterministic01(`${seed}:expression`) * 4);
  const accessoryIdx = Math.floor(deterministic01(`${seed}:accessory`) * 6);
  const bgIdx = Math.floor(deterministic01(`${seed}:bg`) * 6);
  const lightIdx = Math.floor(deterministic01(`${seed}:light`) * 5);
  const frameIdx = deterministic01(`${seed}:frame`) * 100;

  const genders: NpcGender[] = ["male", "female", "neutral"];
  const races: NpcRace[] = ["human", "elf", "dwarf", "orc"];
  const expressions: NpcVisualTraits["expression"][] = ["neutral", "happy", "serious", "mysterious"];
  const accessories: NpcVisualTraits["accessoryType"][] = ["none", "hat", "circlet", "scarf", "mask", "tattoo"];
  
  const bgColors = ["#1A1A2E", "#16213E", "#0F3460", "#1A1A1A", "#2D2D44", "#1E1E3F"];
  const lightColors = ["#FFD700", "#00CED1", "#FF6B6B", "#9B59B6", "#3498DB"];

  // Frame style based on some internal logic
  let frameStyle: NpcVisualTraits["frameStyle"] = "common";
  if (frameIdx > 95) frameStyle = "legendary";
  else if (frameIdx > 80) frameStyle = "epic";
  else if (frameIdx > 60) frameStyle = "rare";
  else if (frameIdx > 30) frameStyle = "uncommon";

  return {
    category,
    race: races[raceIdx],
    gender: genders[genderIdx],
    skinTone: SKIN_TONES[skinIdx],
    hairColor: HAIR_COLORS[hairIdx],
    hairStyle: styleIdx,
    clothingPrimary: CLOTHING_BY_CATEGORY[category][clothIdx][0],
    clothingSecondary: CLOTHING_BY_CATEGORY[category][clothIdx][1],
    armorLevel: ARMOR_BY_CATEGORY[category],
    hasCape,
    hasHood,
    expression: expressions[expressionIdx],
    accessoryType: accessories[accessoryIdx],
    weaponType: WEAPON_BY_CATEGORY[category],
    backgroundColor: bgColors[bgIdx],
    lightingColor: lightColors[lightIdx],
    frameStyle,
  };
}

// Get CSS class for frame style
export function getFrameStyleClass(frameStyle: NpcVisualTraits["frameStyle"]): string {
  const frameClasses: Record<NpcVisualTraits["frameStyle"], string> = {
    common: "npc-portrait-frame--common",
    uncommon: "npc-portrait-frame--uncommon",
    rare: "npc-portrait-frame--rare",
    epic: "npc-portrait-frame--epic",
    legendary: "npc-portrait-frame--legendary",
  };
  return frameClasses[frameStyle];
}

// Generate SVG portrait based on visual traits (Diablo 4 cinematic style)
export function generatePortraitSVG(traits: NpcVisualTraits, npcName: string): string {
  const { 
    skinTone, hairColor, hairStyle, clothingPrimary, clothingSecondary,
    armorLevel, hasCape, hasHood, expression, accessoryType,
    weaponType, backgroundColor, lightingColor, gender, race 
  } = traits;

  // Hair style geometry (0-7 different styles)
  const hairPaths: Record<number, string> = {
    0: `<path d="M30,25 Q50,15 70,25 L70,40 Q50,35 30,40 Z" fill="${hairColor}"/>`, // Short
    1: `<path d="M25,20 Q50,5 75,20 L75,55 Q50,50 25,55 Z" fill="${hairColor}"/>`, // Long
    2: `<path d="M35,20 Q50,10 65,20 L65,35 Q50,30 35,35 Z" fill="${hairColor}"/><path d="M30,35 L25,55 M70,35 L75,55" stroke="${hairColor}" stroke-width="4"/>`, // Braided
    3: `<path d="M30,20 Q50,8 70,20 L72,30 Q50,25 28,30 Z" fill="${hairColor}"/><ellipse cx="50" cy="25" rx="18" ry="8" fill="${hairColor}"/>`, // Ponytail
    4: `<path d="M28,15 Q50,0 72,15 L75,45 Q50,40 25,45 Z" fill="${hairColor}"/>`, // Bald-ish
    5: `<path d="M25,25 Q50,10 75,25 L70,50 Q50,45 30,50 Z" fill="${hairColor}"/><path d="M25,25 Q20,35 25,45 M75,25 Q80,35 75,45" stroke="${hairColor}" stroke-width="3"/>`,
    6: `<path d="M35,22 Q50,12 65,22 L65,35 Q50,30 35,35 Z" fill="${hairColor}"/><path d="M25,30 Q20,45 30,60 M75,30 Q80,45 70,60" stroke="${hairColor}" stroke-width="5"/>`, // Warrior
    7: `<path d="M30,18 Q50,5 70,18 L72,35 Q50,30 28,35 Z" fill="${hairColor}"/><path d="M40,10 L45,20 M55,10 L50,20" stroke="${hairColor}" stroke-width="3"/>`,
  };

  // Weapon icon SVG
  const weaponIcons: Record<string, string> = {
    none: "",
    sword: `<path d="M65,65 L85,45 L82,42 L62,62 Z M85,45 L90,40 L87,37 L82,42" stroke="#C0C0C0" stroke-width="2" fill="none"/>`,
    staff: `<path d="M70,70 L70,30 M60,35 Q70,25 80,35" stroke="#8B4513" stroke-width="4" fill="none"/><circle cx="70" cy="25" r="8" fill="${lightingColor}" opacity="0.8"/>`,
    bow: `<path d="M55,75 Q75,50 55,25" stroke="#8B4513" stroke-width="3" fill="none"/><path d="M55,25 L55,75" stroke="#C0C0C0" stroke-width="1"/>`,
    axe: `<path d="M70,70 L70,35" stroke="#8B4513" stroke-width="4"/><path d="M55,30 L70,40 L85,30 L75,45 Z" fill="#696969"/>`,
    shield: `<ellipse cx="70" cy="50" rx="15" ry="20" fill="#4169E1" stroke="#FFD700" stroke-width="2"/>`,
    dagger: `<path d="M70,70 L80,50 L77,47 L67,67 Z" fill="#C0C0C0"/><path d="M70,70 L70,75" stroke="#8B4513" stroke-width="3"/>`,
    hammer: `<path d="M70,70 L70,40" stroke="#8B4513" stroke-width="4"/><rect x="55" y="35" width="30" height="12" fill="#696969" transform="rotate(-15 70 41)"/>`,
  };

  // Armor overlay SVG
  const armorOverlay = armorLevel > 0 ? `
    <path d="M35,45 L50,55 L65,45 L65,75 L35,75 Z" fill="${armorLevel >= 2 ? '#696969' : '#4A4A4A'}" opacity="${armorLevel * 0.3}"/>
    ${armorLevel >= 2 ? `<path d="M40,50 L50,58 L60,50 M40,55 L50,63 L60,55" stroke="#C0C0C0" stroke-width="1" fill="none"/>` : ''}
    ${armorLevel >= 3 ? `<circle cx="50" cy="55" r="3" fill="#FFD700"/>` : ''}
  ` : '';

  // Accessory SVG
  const accessoryOverlay: Record<string, string> = {
    none: "",
    hat: `<path d="M25,30 L50,15 L75,30 L75,35 L25,35 Z" fill="#4A3728"/>`,
    circlet: `<path d="M30,28 Q50,20 70,28" stroke="#FFD700" stroke-width="3" fill="none"/><circle cx="50" cy="24" r="3" fill="#9B59B6"/>`,
    scarf: `<path d="M35,50 Q50,60 65,50 L68,70 Q50,80 32,70 Z" fill="#CD5C5C"/>`,
    mask: `<path d="M35,40 L65,40 L65,55 Q50,60 35,55 Z" fill="#2F2F2F" opacity="0.7"/>`,
    tattoo: `<path d="M70,35 L75,50 M72,40 L78,45" stroke="#4169E1" stroke-width="2"/>`,
  };

  // Expression (eyes/mouth)
  const expressionOverlay: Record<string, string> = {
    neutral: `<ellipse cx="42" cy="42" rx="4" ry="3" fill="#2F2F2F"/><ellipse cx="58" cy="42" rx="4" ry="3" fill="#2F2F2F"/><path d="M45,55 Q50,57 55,55" stroke="#2F2F2F" stroke-width="2" fill="none"/>`,
    happy: `<path d="M38,40 Q42,38 46,40" stroke="#2F2F2F" stroke-width="2" fill="none"/><path d="M54,40 Q58,38 62,40" stroke="#2F2F2F" stroke-width="2" fill="none"/><path d="M42,54 Q50,60 58,54" stroke="#2F2F2F" stroke-width="2" fill="none"/>`,
    serious: `<ellipse cx="42" cy="42" rx="4" ry="3" fill="#2F2F2F"/><ellipse cx="58" cy="42" rx="4" ry="3" fill="#2F2F2F"/><path d="M42,56 L58,56" stroke="#2F2F2F" stroke-width="2"/>`,
    mysterious: `<path d="M38,42 L46,42" stroke="#2F2F2F" stroke-width="2"/><path d="M54,42 L62,42" stroke="#2F2F2F" stroke-width="2"/><path d="M45,56 Q50,54 55,56" stroke="#2F2F2F" stroke-width="2" fill="none"/>`,
  };

  // Race-based ear modifications
  const earModification = race === "elf" ? `<path d="M28,40 L20,30" stroke="${skinTone}" stroke-width="4"/>` :
                          race === "dwarf" ? `<ellipse cx="30" cy="48" rx="5" ry="8" fill="${skinTone}"/>` : "";

  const categoryLabel = category.replace(/_/g, " ");
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="180" height="180" role="img" aria-label="Portrait of ${npcName}, a ${gender} ${race} ${categoryLabel}">
  <title>Portrait of ${npcName}</title>
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${backgroundColor}"/>
      <stop offset="100%" stop-color="#0A0A15"/>
    </radialGradient>
    <radialGradient id="lightGrad" cx="30%" cy="20%" r="50%">
      <stop offset="0%" stop-color="${lightingColor}" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="${lightingColor}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="100" height="100" fill="url(#bgGrad)"/>
  <rect width="100" height="100" fill="url(#lightGrad)"/>
  
  <!-- Cape (if present) -->
  ${hasCape ? `<path d="M25,50 Q15,80 25,95 L75,95 Q85,80 75,50 Q50,60 25,50" fill="${clothingSecondary}" opacity="0.9"/>` : ''}
  
  <!-- Body/Clothing -->
  <path d="M30,60 L50,55 L70,60 L75,95 L25,95 Z" fill="${clothingPrimary}"/>
  <path d="M35,65 L50,62 L65,65 L65,90 L35,90 Z" fill="${clothingSecondary}" opacity="0.5"/>
  
  ${armorOverlay}
  
  <!-- Neck -->
  <rect x="45" y="50" width="10" height="12" fill="${skinTone}"/>
  
  <!-- Head -->
  <ellipse cx="50" cy="35" rx="22" ry="25" fill="${skinTone}"/>
  
  ${earModification}
  
  <!-- Hair -->
  ${hairPaths[hairStyle] || hairPaths[0]}
  
  <!-- Hood (if present) -->
  ${hasHood ? `<path d="M25,30 Q50,5 75,30 L78,45 Q50,40 22,45 Z" fill="${clothingPrimary}" opacity="0.8"/>` : ''}
  
  <!-- Face Features -->
  ${expressionOverlay[expression]}
  
  <!-- Accessory -->
  ${accessoryOverlay[accessoryType]}
  
  <!-- Weapon (if visible) -->
  ${weaponIcons[weaponType]}
  
  <!-- Subtle glow overlay -->
  <ellipse cx="50" cy="50" rx="40" ry="45" fill="none" stroke="${lightingColor}" stroke-width="0.5" opacity="0.3" filter="url(#glow)"/>
</svg>
  `.trim();
}

// React component for NPC portrait
export interface NpcPortraitProps {
  readonly npcId: string;
  readonly npcName: string;
  readonly role: NpcRole | string;
  readonly npcSeed?: string;
  readonly size?: "small" | "medium" | "large";
  readonly showFrame?: boolean;
  readonly className?: string;
}

export function NpcPortrait({ 
  npcId, 
  npcName, 
  role, 
  npcSeed,
  size = "medium",
  showFrame = true,
  className = "" 
}: NpcPortraitProps) {
  const traits = generateVisualTraits(npcId, role, npcSeed);
  const svgContent = generatePortraitSVG(traits, npcName);
  const frameClass = getFrameStyleClass(traits.frameStyle);
  
  const sizeMap = {
    small: { width: 60, height: 60 },
    medium: { width: 120, height: 120 },
    large: { width: 180, height: 180 },
  };
  
  const { width, height } = sizeMap[size];

  return (
    <div 
      className={`npc-portrait-container ${showFrame ? `npc-portrait ${frameClass}` : ''} ${className}`}
      style={{ width, height }}
      title={npcName}
    >
      <div 
        className="npc-portrait-svg"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{ width, height }}
      />
    </div>
  );
}

export default NpcPortrait;