/**
 * DialogueDirector - Deterministic NPC Dialogue Response Generator
 * 
 * All dialogue is derived deterministically from:
 * - NPC role/name/id
 * - Player HP/gold/equipment state
 * - WorldTick (time-based context with 30-second dialogue epochs)
 * - Biome context for location-aware responses
 * - Optional NPC memory/relationship state
 * 
 * No LLM calls, no async AI, no random(). Fully server-authoritative.
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Intent classification for dialogue - useful for quest system, telemetry, debug
 */
export type DialogueIntent =
  | "GREETING"
  | "LOW_HEALTH_WARNING"
  | "NO_GOLD_HINT"
  | "NO_EQUIPMENT_WARNING"
  | "NIGHT_WARNING"
  | "ROLE_SERVICE";

export interface PlayerContext {
  id: string;
  name?: string;
  health: number;
  maxHealth: number;
  gold: number;
  equipment?: Record<string, unknown>;
}

export interface WorldContext {
  tick: number;
  biomeId?: string;
}

export interface NPCMemoryContext {
  reputation?: number; // -100 to 100
  killedByPlayerCount?: number;
  helpedByPlayerCount?: number;
  lastInteractionTick?: number;
}

export interface DialogueResponse {
  source: string;
  text: string;
  choices: Array<{ id: string; text: string }>;
  npcId: string;
  dialogueSeed: number;
  intent: DialogueIntent;
}

/**
 * Deterministic hash function for consistent seeding
 */
function deterministicHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministic random-like value from seed and index
 */
function seededValue(seed: number, index: number, max: number): number {
  const combined = deterministicHash(`${seed}:${index}`);
  return combined % max;
}

/**
 * Normalize role for case-insensitive comparison
 */
function normalizeRole(role?: string): string {
  return (role ?? "").trim().toLowerCase();
}

/**
 * Get deterministic dialogue epoch (30 seconds at 10Hz tick rate)
 * 300 ticks = 30 seconds at 10Hz
 */
const DIALOGUE_EPOCH_TICKS = 300;

function getDialogueEpoch(tick: number): number {
  return Math.floor(tick / DIALOGUE_EPOCH_TICKS);
}

/**
 * Get biome-aware ambient line for location context
 */
function getBiomeLine(biomeId?: string): string | undefined {
  switch ((biomeId ?? "").toLowerCase()) {
    case "forest":
      return "The forest watches every step you take.";
    case "swamp":
      return "Keep your boots high. The marsh takes what it can.";
    case "desert":
      return "Water is worth more than silver out here.";
    case "snow":
      return "The cold punishes the careless.";
    default:
      return undefined;
  }
}

/**
 * Detect if player is in low HP state (< 30% health)
 */
function isLowHealth(player: PlayerContext): boolean {
  const ratio = player.health / Math.max(1, player.maxHealth);
  return ratio < 0.3;
}

/**
 * Detect if player has no gold
 */
function isBroke(player: PlayerContext): boolean {
  return player.gold <= 0;
}

/**
 * Detect if player is naked (no equipment)
 */
function isNaked(player: PlayerContext): boolean {
  const equip = player.equipment;
  if (!equip) return true;
  const keys = Object.keys(equip);
  return keys.length === 0 || keys.every((k) => !equip[k]);
}

/**
 * Detect night time from world tick
 * Assumes tick 0 = morning, cycles every ~600 ticks
 */
function isNight(tick: number): boolean {
  const cyclePosition = tick % 600;
  return cyclePosition > 400 || cyclePosition < 100;
}

/**
 * Get role-aware greeting based on NPC role (case-insensitive)
 */
function getRoleGreeting(role: string | undefined, npcId: string): string[] {
  const id = npcId.toLowerCase();
  const r = normalizeRole(role);
  
  // Provisioner / Innkeeper
  if (r === "provisioner" || r === "innkeeper" || id.includes("provisioner") || id.includes("innkeeper")) {
    return [
      "Welcome, traveler! The hearth is warm and the bread is fresh.",
      "Rest your weary feet. We have rooms and food available.",
      "Another weary soul seeks shelter. Come in, come in!",
    ];
  }
  
  // Mara (merchant)
  if (r === "mara" || id.includes("mara") || id.includes("merchant")) {
    return [
      "Fine goods for fair prices! Browse my wares.",
      "I have items from distant lands. Care to see?",
      "Trade with me, and prosper!",
    ];
  }
  
  // Smith / Blacksmith / Brann
  if (r === "smith" || r === "blacksmith" || id.includes("smith") || id.includes("brann")) {
    return [
      "Steel and iron, the foundation of civilization.",
      "Need a blade sharpened or armor repaired?",
      "The forge burns eternal. What can I forge for you?",
    ];
  }
  
  // Guard / Captain
  if (r === "guard" || r === "captain" || id.includes("guard") || id.includes("captain")) {
    return [
      "State your business, citizen.",
      "The watch is vigilant. Report any disturbances.",
      "All who enter these walls are under my protection.",
    ];
  }
  
  // Healer
  if (r === "healer" || id.includes("healer") || id.includes("priest")) {
    return [
      "May the light guide your path.",
      "Restoration begins with peace of mind.",
      "I sense your wounds. Let me tend to them.",
    ];
  }
  
  // Fallback npc
  return [
    "Good day, traveler.",
    "The roads are quiet today.",
    "What brings you to these parts?",
  ];
}

/**
 * Get contextual dialogue based on player state (returns text and intent)
 */
function getContextualDialogue(
  player: PlayerContext,
  world: WorldContext,
  role: string | undefined,
  npcId: string,
  dialogueSeed: number
): { text: string; intent: DialogueIntent } {
  const id = npcId.toLowerCase();
  const r = normalizeRole(role);
  
  // Low HP warnings (priority 1)
  if (isLowHealth(player)) {
    if (r === "healer" || id.includes("healer") || id.includes("priest")) {
      return { text: "You bear wounds that need tending. Let me help you, friend.", intent: "LOW_HEALTH_WARNING" };
    }
    if (r === "guard" || id.includes("guard")) {
      return { text: "You look worse for wear. Seek the healer's house for restoration.", intent: "LOW_HEALTH_WARNING" };
    }
    return { text: "You seem injured. Perhaps a healer could assist you.", intent: "LOW_HEALTH_WARNING" };
  }
  
  // Broke player (priority 2)
  if (isBroke(player)) {
    if (id.includes("mara") || id.includes("merchant")) {
      return { text: "No gold? Perhaps you could help with a task to earn some coin.", intent: "NO_GOLD_HINT" };
    }
    return { text: "Without coin, options are limited. Work brings reward in these lands.", intent: "NO_GOLD_HINT" };
  }
  
  // Naked player (priority 3)
  if (isNaked(player)) {
    if (r === "smith" || id.includes("smith") || id.includes("brann")) {
      return { text: "Walking the roads unarmored is dangerous. I can craft you protection.", intent: "NO_EQUIPMENT_WARNING" };
    }
    return { text: "A dangerous journey lies ahead. Equipment may serve you well.", intent: "NO_EQUIPMENT_WARNING" };
  }
  
  // Night time (priority 4)
  if (isNight(world.tick)) {
    if (r === "provisioner" || r === "innkeeper" || id.includes("inn")) {
      return { text: "The night grows cold. Rooms are available, warm and secure.", intent: "NIGHT_WARNING" };
    }
    return { text: "Night falls upon the land. Travel carefully, traveler.", intent: "NIGHT_WARNING" };
  }
  
  // Default role-aware greeting with biome context (priority 5)
  const greetings = getRoleGreeting(role, npcId);
  const epoch = getDialogueEpoch(world.tick);
  const seed = deterministicHash(`${npcId}:${epoch}:greeting`);
  const index = seededValue(seed, 0, greetings.length);
  const greetingText = greetings[index];
  
  // Append biome line if available and player is not in distress
  const biomeLine = getBiomeLine(world.biomeId);
  if (biomeLine) {
    return { text: `${greetingText} ${biomeLine}`, intent: "GREETING" };
  }
  
  return { text: greetingText, intent: "GREETING" };
}

/**
 * Deterministic choice rotation - keeps core options stable, varies order
 */
function rotateChoices<T>(choices: T[], seed: number, maxRotate: number = 2): T[] {
  if (choices.length <= 2) return choices;
  const rotation = seededValue(seed, 0, maxRotate + 1);
  if (rotation === 0) return choices;
  return [...choices.slice(rotation), ...choices.slice(0, rotation)];
}

/**
 * Generate choices based on NPC role (case-insensitive)
 */
function generateChoices(role: string | undefined, npcId: string, dialogueSeed: number): Array<{ id: string; text: string }> {
  const id = npcId.toLowerCase();
  const r = normalizeRole(role);
  const baseChoices = [
    { id: "greet", text: "Greetings" },
    { id: "farewell", text: "Farewell" },
  ];
  
  // Role-specific choices
  if (r === "provisioner" || r === "innkeeper" || id.includes("inn")) {
    return rotateChoices([
      { id: "rest", text: "Rest here" },
      { id: "eat", text: "Buy food" },
      { id: "gossip", text: "Hear news" },
      ...baseChoices,
    ], dialogueSeed);
  }
  
  if (id.includes("mara") || id.includes("merchant")) {
    return rotateChoices([
      { id: "browse", text: "Browse wares" },
      { id: "sell", text: "Sell items" },
      { id: "trade", text: "Propose trade" },
      ...baseChoices,
    ], dialogueSeed);
  }
  
  if (r === "smith" || r === "blacksmith" || id.includes("smith") || id.includes("brann")) {
    return rotateChoices([
      { id: "repair", text: "Repair equipment" },
      { id: "forge", text: "Commission item" },
      { id: "upgrade", text: "Upgrade weapon" },
      ...baseChoices,
    ], dialogueSeed);
  }
  
  if (r === "guard" || r === "captain" || id.includes("guard")) {
    return rotateChoices([
      { id: "report", text: "Report trouble" },
      { id: "quest", text: "Request task" },
      { id: "advice", text: "Ask for advice" },
      ...baseChoices,
    ], dialogueSeed);
  }
  
  if (r === "healer" || id.includes("healer")) {
    return rotateChoices([
      { id: "heal", text: "Request healing" },
      { id: "bless", text: "Receive blessing" },
      { id: "pray", text: "Pray together" },
      ...baseChoices,
    ], dialogueSeed);
  }
  
  return baseChoices;
}

/**
 * Main deterministic dialogue response generator
 * 
 * @param npc - NPC object with id, name, role
 * @param player - Player object with health, maxHealth, gold, equipment
 * @param world - World context with tick and biomeId
 * @param memory - Optional NPC memory/relationship context
 * @returns Deterministic dialogue response with intent classification
 */
export function generateInteractionResponse(
  npc: { id: string; name?: string; role?: string },
  player: PlayerContext,
  world: WorldContext,
  memory?: NPCMemoryContext
): DialogueResponse {
  // Create deterministic seed using dialogue epoch (30-second windows)
  const dialogueEpoch = getDialogueEpoch(world.tick);
  const dialogueSeed = deterministicHash(
    `${npc.id}:${player.id}:${dialogueEpoch}:${world.biomeId ?? "none"}:dialogue`
  );
  
  // Generate dialogue text with intent classification
  const { text, intent } = getContextualDialogue(player, world, npc.role, npc.id, dialogueSeed);
  
  // Generate choices (now uses dialogueSeed for rotation)
  const choices = generateChoices(npc.role, npc.id, dialogueSeed);
  
  return {
    source: npc.name || "NPC",
    text,
    choices,
    npcId: npc.id,
    dialogueSeed,
    intent,
  };
}