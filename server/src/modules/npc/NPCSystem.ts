import { NPCPersonalityEngine } from "./NPCPersonalityEngine.js";
import { NPCMemoryEngine } from "./NPCMemoryEngine.js";
import { NPCGenealogyEngine } from "./NPCGenealogyEngine.js";
import fs from "fs";
import path from "path";

/**
 * NPCSystem — manages all non-player characters in the game world.
 *
 * On construction the system loads two JSON data files:
 * - `game-data/npc/npcs.json`          — NPC definitions (stats, role, dialogue
 *                                         references, drop tables, quest hooks).
 * - `game-data/dialogue/dialogues.json` — Dialogue trees, including greeting
 *                                         text, branching nodes, quest-state
 *                                         lines, and reputation conditions.
 *
 * NPCs are instantiated at runtime via {@link createNPC}, which merges the
 * static definition with generated procedural data (personality traits,
 * memory, genealogy lineage).  The resulting live NPC objects are stored in
 * `npcs` and mutated in place (e.g. health changes during combat).
 *
 * ### Dialogue system
 * Dialogue resolution supports two overlapping approaches:
 * 1. **Legacy quest hooks** — simple per-quest lines keyed by quest ID
 *    (`questStartLines`, `questProgressLines`, `questCompleteLines`).
 * 2. **Branching nodes** — a graph of named nodes, each with conditional
 *    entry points (`entryNodes`) and player-selectable `choices`.  Choices
 *    can set player flags, modify faction reputation, and trigger quests.
 *
 * @see {@link WorldTick} for the message handler that calls
 *      {@link handleInteraction} and {@link handleChoice}.
 */
export class NPCSystem {
  private npcs: Map<string, any> = new Map();
  private npcDefinitions: Map<string, any> = new Map();
  private dialogues: Map<string, any> = new Map();

  public personalityEngine: NPCPersonalityEngine;
  public memoryEngine: NPCMemoryEngine;
  public genealogyEngine: NPCGenealogyEngine;

  /**
   * Initialises sub-engines and eagerly loads NPC and dialogue data from disk.
   */
  constructor() {
    this.personalityEngine = new NPCPersonalityEngine();
    this.memoryEngine = new NPCMemoryEngine();
    this.genealogyEngine = new NPCGenealogyEngine();
    this.loadData();
  }

  /**
   * Reads NPC definitions and dialogue data from their respective JSON files.
   * Called once during construction.  Parse/IO errors are caught and logged;
   * the system continues with empty maps if either file is unavailable.
   */
  private loadData() {
    try {
      const npcsPath = path.resolve(process.cwd(), "game-data/npc/npcs.json");
      const dialoguesPath = path.resolve(process.cwd(), "game-data/dialogue/dialogues.json");

      if (fs.existsSync(npcsPath)) {
        const npcData = JSON.parse(fs.readFileSync(npcsPath, "utf-8"));
        npcData.forEach((npc: any) => this.npcDefinitions.set(npc.id, npc));
      }

      if (fs.existsSync(dialoguesPath)) {
        const dialogueData = JSON.parse(fs.readFileSync(dialoguesPath, "utf-8"));
        dialogueData.forEach((dialogue: any) => this.dialogues.set(dialogue.id, dialogue));
      }
    } catch (error) {
      console.error("Error loading NPC or Dialogue data:", error);
    }
  }

  /**
   * Instantiates a live NPC and registers it in the active NPC map.
   *
   * The NPC is initialised with stats from the matching definition in
   * `npcDefinitions` (identified by `id`).  If no definition is found,
   * sensible defaults are applied (role `"Citizen"`, 100/100 HP, etc.).
   * Procedural data is generated for personality, memory, and genealogy.
   *
   * @param id   - Matches a key in `game-data/npc/npcs.json`.
   * @param name - Override for the NPC's display name; falls back to the
   *               definition's `name` field, then `"Unknown NPC"`.
   * @param x    - Initial world-space X coordinate.
   * @param y    - Initial world-space Y coordinate.
   * @returns The newly created NPC object.
   */
  createNPC(id: string, name: string, x: number, y: number) {
    const def = this.npcDefinitions.get(id);
    const npc = {
      id,
      name: name || (def ? def.name : "Unknown NPC"),
      role: def ? def.role : "Citizen",
      position: { x, y, z: 0 },
      health: def?.stats?.health || 100,
      maxHealth: def?.stats?.maxHealth || 100,
      dropTable: def?.dropTable || [],
      stamina: 100,
      inventory: [],
      personality: this.personalityEngine.generateTraits(),
      memory: [],
      dna: this.genealogyEngine.createLineage(id, "Unknown"),
      dialogueId: def ? def.dialogueId : null,
      questHooks: def ? def.questHooks : []
    };
    this.npcs.set(id, npc);
    return npc;
  }

  /**
   * Returns the live NPC object for the given ID, or `undefined` if not found.
   *
   * @param id - NPC ID (same as the key used in {@link createNPC}).
   */
  getNPC(id: string) {
    return this.npcs.get(id);
  }

  /**
   * Resolves the dialogue response for a player initiating interaction with
   * an NPC.
   *
   * Resolution priority:
   * 1. **Branching nodes** — if `dialogue.nodes` exists, `entryNodes` are
   *    checked in order and the first node whose conditions are met becomes
   *    active.  Player flags, quest state, and faction reputation are all
   *    evaluated.
   * 2. **Legacy quest hooks** — if no matching entry node is found, the NPC's
   *    `questHooks` array is scanned.  Quest-specific lines (`questStartLines`,
   *    `questProgressLines`, `questCompleteLines`) override the default greeting.
   * 3. **Fallback** — a generic welcome message is returned for NPCs with no
   *    dialogue data.
   *
   * @param npcId            - ID of the NPC being interacted with.
   * @param player           - The interacting player object (for quest/flag/rep checks).
   * @param questDefinitions - Map of all quest definitions, used to check prerequisites.
   * @returns A dialogue response object with `source`, `text`, optional
   *          `choices`, optional `questId`, and `npcId`; or `null` if the NPC
   *          does not exist.
   */
  handleInteraction(npcId: string, player: any, questDefinitions: Map<string, any> = new Map()) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;
    
    const playerQuests = player.quests || [];
    const playerFlags = player.flags || {};
    const playerReputation = player.reputation || {};

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue) {
      return {
        source: npc.name,
        text: `Hello, I am ${npc.name}. Welcome to Areloria!`,
        questId: null
      };
    }

    // Check if there's a specific node to start with based on quest state
    let startNodeId = "root";
    let text = dialogue.greeting;
    let questId = null;
    let choices = [];

    // Check for quest-specific dialogue (Old Logic)
    if (npc.questHooks && npc.questHooks.length > 0) {
      for (const qId of npc.questHooks) {
        const playerQuest = playerQuests.find((q: any) => q.id === qId);
        if (!playerQuest) {
          const questDef = questDefinitions.get(qId);
          let prereqsMet = true;
          if (questDef && questDef.prerequisiteQuestIds) {
            for (const preId of questDef.prerequisiteQuestIds) {
              const preQuest = playerQuests.find((q: any) => q.id === preId);
              if (!preQuest || !preQuest.completed) {
                prereqsMet = false;
                break;
              }
            }
          }

          if (!prereqsMet) {
            if (dialogue.questPrerequisiteLines && dialogue.questPrerequisiteLines[qId]) {
              text = dialogue.questPrerequisiteLines[qId];
              break;
            }
            continue;
          }

          if (dialogue.questStartLines && dialogue.questStartLines[qId]) {
            text = dialogue.questStartLines[qId];
            questId = qId;
            break;
          }
        } else if (!playerQuest.completed) {
          if (dialogue.questProgressLines && dialogue.questProgressLines[qId]) {
            text = dialogue.questProgressLines[qId];
            break;
          }
        } else {
          if (dialogue.questCompleteLines && dialogue.questCompleteLines[qId]) {
            text = dialogue.questCompleteLines[qId];
            break;
          }
        }
      }
    }

    // New Logic: Branching Nodes
    if (dialogue.nodes) {
      // Determine which node to show
      let activeNodeId = "root";
      
      // If we have quest-specific nodes, we could prioritize them here
      // For now, let's just use "root" as default or check for state-based entry nodes
      if (dialogue.entryNodes) {
        for (const entry of dialogue.entryNodes) {
          let match = true;
          if (entry.conditionFlag && !playerFlags[entry.conditionFlag]) match = false;
          if (entry.conditionQuestId) {
            const q = playerQuests.find((pq: any) => pq.id === entry.conditionQuestId);
            if (entry.conditionQuestState === "completed" && (!q || !q.completed)) match = false;
            if (entry.conditionQuestState === "active" && (!q || q.completed)) match = false;
            if (entry.conditionQuestState === "not_started" && q) match = false;
          }
          if (entry.conditionReputation) {
            const rep = playerReputation[entry.conditionReputation.factionId] || 0;
            if (entry.conditionReputation.min !== undefined && rep < entry.conditionReputation.min) match = false;
            if (entry.conditionReputation.max !== undefined && rep > entry.conditionReputation.max) match = false;
          }
          if (match) {
            activeNodeId = entry.nodeId;
            break;
          }
        }
      }

      const node = dialogue.nodes[activeNodeId];
      if (node) {
        text = node.text;
        choices = (node.choices || []).filter((c: any) => {
          if (c.conditionFlag && !playerFlags[c.conditionFlag]) return false;
          if (c.conditionReputation) {
            const rep = playerReputation[c.conditionReputation.factionId] || 0;
            if (c.conditionReputation.min !== undefined && rep < c.conditionReputation.min) return false;
            if (c.conditionReputation.max !== undefined && rep > c.conditionReputation.max) return false;
          }
          return true;
        });
      }
    }

    return {
      source: npc.name,
      text,
      questId,
      choices,
      npcId
    };
  }

  /**
   * Processes a player's selection of a dialogue choice and advances the
   * conversation to the next node.
   *
   * Side effects applied from the chosen option:
   * - `setFlag`          — sets a boolean flag on the player object.
   * - `changeReputation` — adjusts the player's reputation with a faction.
   *   Reputation-changing choices are one-time-use; subsequent selections
   *   by the same player are silently ignored via `player.usedChoices`.
   *
   * @param npcId    - ID of the NPC whose dialogue is being navigated.
   * @param nodeId   - ID of the current dialogue node containing the choice.
   * @param choiceId - ID of the choice the player selected.
   * @param player   - The player making the choice (mutated for flag/rep effects).
   * @returns The dialogue response for the next node (same shape as
   *          {@link handleInteraction}'s return value), or `null` if any
   *          lookup fails (unknown NPC, node, or choice).
   */
  handleChoice(npcId: string, nodeId: string, choiceId: string, player: any) {
    const npc = this.npcs.get(npcId);
    if (!npc) return null;

    const dialogue = this.dialogues.get(npc.dialogueId);
    if (!dialogue || !dialogue.nodes) return null;

    const node = dialogue.nodes[nodeId];
    if (!node) return null;

    const choice = (node.choices || []).find((c: any) => c.id === choiceId);
    if (!choice) return null;

    // Check if choice is already used (if it changes reputation)
    if (choice.changeReputation) {
      if (!player.usedChoices) player.usedChoices = [];
      if (player.usedChoices.includes(choiceId)) return null; // Already used
      player.usedChoices.push(choiceId);
    }

    // Apply effects of the choice
    if (choice.setFlag) {
      player.flags[choice.setFlag] = true;
    }
    if (choice.changeReputation) {
      if (!player.reputation) player.reputation = {};
      const { factionId, amount } = choice.changeReputation;
      player.reputation[factionId] = (player.reputation[factionId] || 0) + amount;
    }

    const nextNode = dialogue.nodes[choice.nextNodeId];
    if (!nextNode) return null;

    let questId = nextNode.triggerQuestId || null;
    let text = nextNode.text;
    let choices = (nextNode.choices || []).filter((c: any) => {
      if (c.conditionFlag && !player.flags[c.conditionFlag]) return false;
      if (c.conditionReputation) {
        const rep = (player.reputation && player.reputation[c.conditionReputation.factionId]) || 0;
        if (c.conditionReputation.min !== undefined && rep < c.conditionReputation.min) return false;
        if (c.conditionReputation.max !== undefined && rep > c.conditionReputation.max) return false;
      }
      return true;
    });

    return {
      source: npc.name,
      text,
      questId,
      choices,
      npcId
    };
  }

  /**
   * Returns all currently registered live NPC objects as an array.
   * Used by {@link WorldTick.tick} to include NPC state in the world-tick broadcast.
   */
  getAllNPCs() {
    return Array.from(this.npcs.values());
  }

  /**
   * Called once per world tick (10 Hz) to advance NPC simulation.
   * Currently a stub; future implementations will process AI behaviour,
   * daily schedules, needs, and social interactions.
   */
  tick() {
    // Process NPC AI, schedules, needs
  }
}
