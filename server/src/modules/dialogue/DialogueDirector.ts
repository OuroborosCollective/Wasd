/**
 * DialogueDirector - Deterministic NPC Dialogue Response Generator
 * 
 * All dialogue is derived deterministically from:
 * - NPC role/name/id
 * - Player HP/gold/equipment state
 * - WorldTick (time-based context)
 * 
 * No LLM calls, no async AI, no 0
 */

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

export interface DialogueResponse {
  source: string;
  text: string;
  choices: Array<{ id: string; text: string }>;
  npcId: string;
  dialogueSeed: number;
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
 * Get role-aware greeting based on NPC role
 */
function getRoleGreeting(role: string | undefined, npcId: string): string[] {
  const id = npcId.toLowerCase();
  
  // Provisioner / Innkeeper
  if (role === "provisioner" || role === "innkeeper" || id.includes("provisioner") || id.includes("innkeeper")) {
    return [
      "Welcome, traveler! The hearth is warm and the bread is fresh.",
      "Rest your weary feet. We have rooms and food available.",
      "Another weary soul seeks shelter. Come in, come in!",
    ];
  }
  
  // Mara (merchant)
  if (role === "mara" || id.includes("mara") || id.includes("merchant")) {
    return [
      "Fine goods for fair prices! Browse my wares.",
      "I have items from distant lands. Care to see?",
      "Trade with me, and prosper!",
    ];
  }
  
  // Smith / Blacksmith / Brann
  if (role === "smith" || role === "blacksmith" || id.includes("smith") || id.includes("brann")) {
    return [
      "Steel and iron, the foundation of civilization.",
      "Need a blade sharpened or armor repaired?",
      "The forge burns eternal. What can I forge for you?",
    ];
  }
  
  // Guard / Captain
  if (role === "guard" || role === "captain" || id.includes("guard") || id.includes("captain")) {
    return [
      "State your business, citizen.",
      "The watch is vigilant. Report any disturbances.",
      "All who enter these walls are under my protection.",
    ];
  }
  
  // Healer
  if (role === "healer" || id.includes("healer") || id.includes("priest")) {
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
 * Get contextual dialogue based on player state
 */
function getContextualDialogue(player: PlayerContext, world: WorldContext, role: string | undefined, npcId: string): string {
  const id = npcId.toLowerCase();
  
  // Low HP warnings
  if (isLowHealth(player)) {
    if (role === "healer" || id.includes("healer") || id.includes("priest")) {
      return "You bear wounds that need tending. Let me help you, friend.";
    }
    if (role === "guard" || id.includes("guard")) {
      return "You look worse for wear. Seek the healer's house for restoration.";
    }
    return "You seem injured. Perhaps a healer could assist you.";
  }
  
  // Broke player
  if (isBroke(player)) {
    if (id.includes("mara") || id.includes("merchant")) {
      return "No gold? Perhaps you could help with a task to earn some coin.";
    }
    return "Without coin, options are limited. Work brings reward in these lands.";
  }
  
  // Naked player
  if (isNaked(player)) {
    if (role === "smith" || id.includes("smith") || id.includes("brann")) {
      return "Walking the roads unarmored is dangerous. I can craft you protection.";
    }
    return "A dangerous journey lies ahead. Equipment may serve you well.";
  }
  
  // Night time
  if (isNight(world.tick)) {
    if (role === "provisioner" || role === "innkeeper" || id.includes("inn")) {
      return "The night grows cold. Rooms are available, warm and secure.";
    }
    return "Night falls upon the land. Travel carefully, traveler.";
  }
  
  // Default role-aware greeting
  const greetings = getRoleGreeting(role, npcId);
  const seed = deterministicHash(`${npcId}:${world.tick}:greeting`);
  const index = seededValue(seed, 0, greetings.length);
  return greetings[index];
}

/**
 * Generate choices based on NPC role
 */
function generateChoices(role: string | undefined, npcId: string, dialogueSeed: number): Array<{ id: string; text: string }> {
  const id = npcId.toLowerCase();
  const baseChoices = [
    { id: "greet", text: "Greetings" },
    { id: "farewell", text: "Farewell" },
  ];
  
  // Role-specific choices
  if (role === "provisioner" || role === "innkeeper" || id.includes("inn")) {
    return [
      { id: "rest", text: "Rest here" },
      { id: "eat", text: "Buy food" },
      { id: "gossip", text: "Hear news" },
      ...baseChoices,
    ];
  }
  
  if (id.includes("mara") || id.includes("merchant")) {
    return [
      { id: "browse", text: "Browse wares" },
      { id: "sell", text: "Sell items" },
      { id: "trade", text: "Propose trade" },
      ...baseChoices,
    ];
  }
  
  if (role === "smith" || id.includes("smith") || id.includes("brann")) {
    return [
      { id: "repair", text: "Repair equipment" },
      { id: "forge", text: "Commission item" },
      { id: "upgrade", text: "Upgrade weapon" },
      ...baseChoices,
    ];
  }
  
  if (role === "guard" || id.includes("guard")) {
    return [
      { id: "report", text: "Report trouble" },
      { id: "quest", text: "Request task" },
      { id: "advice", text: "Ask for advice" },
      ...baseChoices,
    ];
  }
  
  if (role === "healer" || id.includes("healer")) {
    return [
      { id: "heal", text: "Request healing" },
      { id: "bless", text: "Receive blessing" },
      { id: "pray", text: "Pray together" },
      ...baseChoices,
    ];
  }
  
  return baseChoices;
}

/**
 * Main deterministic dialogue response generator
 * 
 * @param npc - NPC object with id, name, role
 * @param player - Player object with health, maxHealth, gold, equipment
 * @param world - World context with tick and biomeId
 * @returns Deterministic dialogue response
 */
export function generateInteractionResponse(
  npc: { id: string; name?: string; role?: string },
  player: PlayerContext,
  world: WorldContext
): DialogueResponse {
  // Create deterministic seed from npc, player, and world
  const dialogueSeed = deterministicHash(
    `${npc.id}:${player.id}:${world.tick}:dialogue`
  );
  
  // Generate dialogue text
  const text = getContextualDialogue(player, world, npc.role, npc.id);
  
  // Generate choices
  const choices = generateChoices(npc.role, npc.id, dialogueSeed);
  
  return {
    source: npc.name || "NPC",
    text,
    choices,
    npcId: npc.id,
    dialogueSeed,
  };
}