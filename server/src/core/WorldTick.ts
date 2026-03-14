import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { SkillSystem } from "../modules/skill/SkillSystem.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import { ChatSystem } from "../modules/chat/ChatSystem.js";
import { LootSystem } from "../modules/loot/LootSystem.js";
import { cache } from "./Cache.js";
import fs from "fs";
import path from "path";

import { GameWebSocketServer } from "../networking/WebSocketServer.js";

export class WorldTick {
  private timer: NodeJS.Timeout | null = null;
  private tickCount = 0;

  public chunkSystem: ChunkSystem;
  public observerEngine: ObserverEngine;
  public playerSystem: PlayerSystem;
  public combatSystem: CombatSystem;
  public inventorySystem: InventorySystem;
  public npcSystem: NPCSystem;
  public guildSystem: GuildSystem;
  public economySystem: EconomySystem;
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  public skillSystem: SkillSystem;
  public craftingSystem: CraftingSystem;
  public chatSystem: ChatSystem;
  public lootSystem: LootSystem;

  private lootEntities: Map<string, any> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private playerToSocket: Map<string, string> = new Map();
  private lastActionTimes: Map<string, Record<string, number>> = new Map();
  private npcRespawnTimers: Map<string, { npcId: string; x: number; y: number; timer: number }> = new Map();
  private keysDown: Map<string, Set<string>> = new Map();
  private saveDebounce: NodeJS.Timeout | null = null;
  private worldState: any = {
    weather: "clear",
    timeOfDay: 12,
    pvp: true,
    friendlyFire: false,
    infiniteWorld: true,
    economySim: true,
    npcAI: true,
    nations: [],
    diplomacy: [],
    territories: {},
    bannedPlayers: [],
    mutedPlayers: [],
    customDialogues: {},
  };

  constructor(private ws: GameWebSocketServer) {
    this.chunkSystem = new ChunkSystem(64);
    this.observerEngine = new ObserverEngine();
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.inventorySystem = new InventorySystem();
    this.npcSystem = new NPCSystem();
    this.guildSystem = new GuildSystem();
    this.economySystem = new EconomySystem();
    this.questSystem = new QuestEngine();
    this.worldSystem = new WorldSystem();
    this.persistence = new PersistenceManager();
    this.glbRegistry = new GLBRegistry();
    this.skillSystem = new SkillSystem();
    this.craftingSystem = new CraftingSystem();
    this.chatSystem = new ChatSystem();
    this.lootSystem = new LootSystem();

    this.ws.onPlayerConnect = (id) => {
      console.log(`Socket ${id} connected. Waiting for login...`);
    };

    this.ws.onPlayerDisconnect = async (id) => {
      const charName = this.socketToPlayer.get(id);
      if (charName) {
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        this.playerToSocket.delete(charName);
        this.keysDown.delete(id);
        this.chatSystem.systemMessage(`${charName} has left the world.`);
        await this.debouncedSave();
        console.log(`Player ${charName} disconnected.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      try {
        await this.handleMessage(id, msg);
      } catch (e) {
        console.error("Error handling message:", e);
      }
    };
  }

  private async handleMessage(id: string, msg: any) {
    if (msg.type === "login") {
      return this.handleLogin(id, msg);
    }

    const charName = this.socketToPlayer.get(id);
    if (!charName) return;
    const player = this.playerSystem.getPlayer(charName);
    if (!player) return;

    switch (msg.type) {
      case "move_start":
        this.handleMoveStart(id, msg);
        break;
      case "move_stop":
        this.handleMoveStop(id, msg);
        break;
      case "move_intent":
        this.handleMoveIntent(id, player, msg);
        break;
      case "attack":
        this.handleAttack(id, player, msg);
        break;
      case "interact":
        this.handleInteract(id, player, msg);
        break;
      case "dialogue_choice":
        this.handleDialogueChoice(id, player, msg);
        break;
      case "equip":
        if (!this.checkCooldown(charName, "equip", 500)) return;
        this.inventorySystem.equipItem(player, msg.itemId);
        this.debouncedSave();
        break;
      case "unequip":
        if (!this.checkCooldown(charName, "equip", 500)) return;
        this.inventorySystem.unequipItem(player, msg.slot);
        this.debouncedSave();
        break;
      case "drop":
        this.inventorySystem.removeItem(player, msg.itemId);
        this.debouncedSave();
        break;
      case "use_item":
        this.handleUseItem(id, player, msg);
        break;
      case "chat":
        this.handleChat(id, player, msg);
        break;
      case "craft":
        this.handleCraft(id, player, msg);
        break;
      case "buy":
        this.handleBuy(id, player, msg);
        break;
      case "sell":
        this.handleSell(id, player, msg);
        break;
      case "get_recipes":
        this.ws.sendToPlayer(id, { type: "recipes", recipes: this.craftingSystem.getRecipes() });
        break;
      case "get_shop":
        this.ws.sendToPlayer(id, { type: "shop_data", shopId: msg.shopId, items: this.economySystem.getShop(msg.shopId || "general_store") });
        break;
      case "get_skills":
        this.ws.sendToPlayer(id, { type: "skills_data", skills: this.skillSystem.getAllSkills(player) });
        break;
      case "admin_glb_scan":
        if (player.role !== "admin") return;
        this.ws.sendToPlayer(id, { type: "admin_glb_scan_result", models: this.glbRegistry.scanModels() });
        break;
      case "admin_glb_list":
        if (player.role !== "admin") return;
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
        break;
      case "admin_glb_link":
        if (player.role !== "admin") return;
        this.glbRegistry.addLink({ glbPath: msg.glbPath, targetType: msg.targetType, targetId: msg.targetId });
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
        break;
      case "admin_glb_unlink":
        if (player.role !== "admin") return;
        this.glbRegistry.removeLink(msg.targetType, msg.targetId);
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
        break;

      // ── GM COMMANDS ──────────────────────────────────────────────────────
      case "gm_set_weather":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.worldState.weather = msg.weather || "clear";
        this.ws.broadcast({ type: "world_event", event: "weather_change", weather: msg.weather });
        break;

      case "gm_set_time":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.worldState.timeOfDay = msg.time || 12;
        this.ws.broadcast({ type: "world_event", event: "time_change", time: msg.time });
        break;

      case "gm_teleport": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const tpTarget = this.playerSystem.getPlayer(msg.player);
        if (tpTarget) {
          tpTarget.position = { x: msg.x || 32, y: msg.y || 32 };
          const tpSocketId = this.playerToSocket.get(msg.player);
          if (tpSocketId) this.ws.sendToPlayer(tpSocketId, { type: "teleport", x: msg.x, y: msg.y });
        }
        break;
      }

      case "gm_place_object":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.broadcast({ type: "world_event", event: "object_placed", objectType: msg.objectType, x: msg.x, y: msg.y });
        break;

      case "gm_world_settings":
        if (player.role !== "admin" && player.role !== "gm") return;
        if (msg.settings) Object.assign(this.worldState, msg.settings);
        break;

      case "gm_spawn_npc": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const spawnId = `${msg.npcId}_${Date.now()}`;
        this.npcSystem.createNPC(spawnId, msg.name || msg.npcId, msg.x || 40, msg.y || 40);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Spawned NPC: ${spawnId}` });
        break;
      }

      case "gm_spawn_npc_at_self": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const selfSpawnId = `${msg.npcId}_${Date.now()}`;
        this.npcSystem.createNPC(selfSpawnId, msg.npcId, player.position.x + 5, player.position.y + 5);
        break;
      }

      case "gm_remove_npc":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.npcSystem.removeNPC(msg.npcId);
        break;

      case "gm_save_dialogue":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.worldState.customDialogues[msg.npcId] = { text: msg.text, choices: msg.choices };
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Dialogue saved for ${msg.npcId}` });
        break;

      case "gm_create_quest":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.questSystem.addQuest({
          id: msg.questId, title: msg.title, description: msg.description,
          category: msg.category || "side", level: msg.level || 1,
          rewards: msg.rewards || { xp: 100, gold: 50 },
          giverNpc: msg.giverNpc, repeatable: msg.repeatable || false,
          objectives: []
        });
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Quest created: ${msg.title}` });
        break;

      case "gm_register_glb":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.glbRegistry.addLink({ glbPath: msg.path, targetType: msg.category || "npc", targetId: msg.name });
        break;

      case "gm_set_price":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.economySystem.setPrice(msg.itemId, msg.buy, msg.sell);
        break;

      case "gm_reset_prices":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.economySystem.resetPrices();
        break;

      case "gm_economy_event":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.broadcast({ type: "world_event", event: "economy_event", eventType: msg.eventType, duration: msg.duration });
        break;

      case "gm_give_item": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const giveTarget = this.playerSystem.getPlayer(msg.player);
        if (giveTarget) {
          if (msg.item === "gold") { giveTarget.gold = (giveTarget.gold || 0) + (msg.amount || 1); }
          else { this.inventorySystem.addItem(giveTarget, { id: msg.item, name: msg.item, quantity: msg.amount || 1 }); }
          this.debouncedSave();
        }
        break;
      }

      case "gm_take_item": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const takeTarget = this.playerSystem.getPlayer(msg.player);
        if (takeTarget) {
          if (msg.item === "gold") { takeTarget.gold = Math.max(0, (takeTarget.gold || 0) - (msg.amount || 1)); }
          else { this.inventorySystem.removeItem(takeTarget, msg.item); }
          this.debouncedSave();
        }
        break;
      }

      case "gm_create_nation":
        if (player.role !== "admin" && player.role !== "gm") return;
        if (!this.worldState.nations) this.worldState.nations = [];
        this.worldState.nations.push({
          name: msg.name, capitalX: msg.capitalX, capitalY: msg.capitalY,
          radius: msg.radius || 200, leader: msg.leader, members: [], guilds: []
        });
        this.ws.broadcast({ type: "world_event", event: "nation_founded", name: msg.name, leader: msg.leader });
        break;

      case "gm_diplomacy":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.worldState.diplomacy = (this.worldState.diplomacy || []).filter((d: any) =>
          !(d.a === msg.nationA && d.b === msg.nationB) && !(d.a === msg.nationB && d.b === msg.nationA)
        );
        this.worldState.diplomacy.push({ a: msg.nationA, b: msg.nationB, relation: msg.relation });
        this.ws.broadcast({ type: "world_event", event: "diplomacy_change", nationA: msg.nationA, nationB: msg.nationB, relation: msg.relation });
        break;

      case "gm_claim_territory":
        if (player.role !== "admin" && player.role !== "gm") return;
        if (!this.worldState.territories) this.worldState.territories = {};
        this.worldState.territories[msg.region] = msg.owner;
        break;

      case "gm_world_event":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.broadcast({ type: "world_event", event: msg.eventId, title: msg.title, description: msg.description });
        break;

      case "gm_broadcast":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.broadcast({ type: "chat", channel: msg.channel || "system", sender: "[GM]", text: msg.message, color: msg.color || "#ffd700" });
        break;

      case "gm_kick": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const kickSocketId = this.playerToSocket.get(msg.player);
        if (kickSocketId) this.ws.sendToPlayer(kickSocketId, { type: "kick", reason: "Kicked by GM" });
        break;
      }

      case "gm_ban": {
        if (player.role !== "admin" && player.role !== "gm") return;
        if (!this.worldState.bannedPlayers) this.worldState.bannedPlayers = [];
        this.worldState.bannedPlayers.push(msg.player);
        const banSocketId = this.playerToSocket.get(msg.player);
        if (banSocketId) this.ws.sendToPlayer(banSocketId, { type: "kick", reason: "Banned by GM" });
        break;
      }

      case "gm_mute":
        if (player.role !== "admin" && player.role !== "gm") return;
        if (!this.worldState.mutedPlayers) this.worldState.mutedPlayers = [];
        this.worldState.mutedPlayers.push(msg.player);
        break;

      case "gm_promote": {
        if (player.role !== "admin") return;
        const promoteTarget = this.playerSystem.getPlayer(msg.player);
        if (promoteTarget) { promoteTarget.role = "gm"; this.debouncedSave(); }
        break;
      }

      case "gm_edit_player": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const editTarget = this.playerSystem.getPlayer(msg.player);
        if (editTarget) {
          if (msg.hp !== undefined) editTarget.health = msg.hp;
          if (msg.maxHp !== undefined) editTarget.maxHealth = msg.maxHp;
          if (msg.gold !== undefined) editTarget.gold = msg.gold;
          if (msg.xp !== undefined) editTarget.xp = msg.xp;
          this.debouncedSave();
        }
        break;
      }

      case "gm_revive": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const reviveTarget = this.playerSystem.getPlayer(msg.player);
        if (reviveTarget) {
          reviveTarget.health = reviveTarget.maxHealth || 100;
          (reviveTarget as any).isDead = false;
          this.debouncedSave();
        }
        break;
      }

      case "gm_get_players":
        if (player.role !== "admin" && player.role !== "gm") return;
        const playerList = this.playerSystem.getAllPlayers().map((p: any) => ({
          name: p.name, level: p.level || 1, hp: p.health, gold: p.gold || 0
        }));
        this.ws.sendToPlayer(id, { type: "gm_player_list", players: playerList });
        break;
    }
  }

  private handleLogin(id: string, msg: any) {
    const charName = msg.name || `Guest_${id.substring(0, 4)}`;
    let player = this.playerSystem.getPlayer(charName);
    if (!player) {
      player = this.playerSystem.createPlayer(charName, charName);
      this.hydratePlayer(player);
    }

    this.socketToPlayer.set(id, charName);
    this.playerToSocket.set(charName, id);
    this.observerEngine.register(id, { x: player.position.x, y: player.position.y });

    this.ws.sendToPlayer(id, {
      type: "welcome",
      id: charName,
      stats: {
        gold: player.gold,
        xp: player.xp,
        level: player.level || 1,
        health: player.health,
        maxHealth: player.maxHealth || 100,
        stamina: player.stamina || 100,
        maxStamina: player.maxStamina || 100,
        mana: player.mana || 25,
        maxMana: player.maxMana || 25,
        inventory: player.inventory,
        equipment: player.equipment,
        quests: player.quests,
        skills: this.skillSystem.getAllSkills(player),
        position: player.position
      }
    });

    // Send recent chat history
    const recentChat = this.chatSystem.getRecentMessages(undefined, 20);
    for (const chatMsg of recentChat) {
      this.ws.sendToPlayer(id, { type: "chat_message", ...chatMsg });
    }

    this.chatSystem.systemMessage(`${charName} has entered the world.`);
    this.ws.broadcast({ type: "chat_message", sender: "System", channel: "system", text: `${charName} has entered the world.`, timestamp: Date.now() });
  }

  private handleMoveStart(id: string, msg: any) {
    if (!this.keysDown.has(id)) this.keysDown.set(id, new Set());
    this.keysDown.get(id)!.add(msg.key);
  }

  private handleMoveStop(id: string, msg: any) {
    this.keysDown.get(id)?.delete(msg.key);
  }

  private handleMoveIntent(id: string, player: any, msg: any) {
    const speed = 5;
    const dx = Math.max(-1, Math.min(1, Number(msg.dx) || 0));
    const dy = Math.max(-1, Math.min(1, Number(msg.dy) || 0));
    if (!isNaN(dx) && !isNaN(dy)) {
      player.position.x += dx * speed;
      player.position.y += dy * speed;
      this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
    }
  }

  private handleAttack(id: string, player: any, msg: any) {
    const charName = this.socketToPlayer.get(id)!;
    if (!this.checkCooldown(charName, "attack", 800)) return;

    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    if (!npc || npc.health === undefined) return;

    const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
    if (dist > 35) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Target is too far away." });
      return;
    }

    const result = this.combatSystem.attack(player, npc);

    if (!result.success) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Not enough stamina!" });
      return;
    }

    // Grant combat XP
    if (result.xpGained > 0) {
      const skillResult = this.skillSystem.addXP(player, "combat", result.xpGained);
      if (skillResult.leveledUp) {
        this.ws.sendToPlayer(id, { type: "level_up", skill: "combat", level: skillResult.skill.level });
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Combat level up! Now level ${skillResult.skill.level}!` });
      }
    }

    this.ws.broadcast({
      type: "combat_feedback",
      targetId,
      attackerId: player.id,
      damage: result.damage,
      hit: result.hit,
      critical: result.critical,
      dodged: result.dodged,
      health: result.defenderHealth,
      maxHealth: result.defenderMaxHealth
    });

    if (npc.health <= 0) {
      this.handleNPCDeath(id, player, npc, targetId);
    }
  }

  private handleNPCDeath(socketId: string, player: any, npc: any, npcInstanceId: string) {
    // Drop loot
    if (npc.dropTable) {
      for (const drop of npc.dropTable) {
        if (Math.random() < drop.chance) {
          const item = ItemRegistry.createInstance(drop.itemId);
          if (item) {
            const lootId = `loot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            this.lootEntities.set(lootId, {
              id: lootId,
              item,
              position: { x: npc.position.x + (Math.random() - 0.5) * 5, y: npc.position.y + (Math.random() - 0.5) * 5 }
            });
          }
        }
      }
    }

    // Gold drop
    const goldDrop = Math.floor(Math.random() * 20) + 5;
    this.economySystem.addGold(player, goldDrop);

    this.ws.sendToPlayer(socketId, {
      type: "dialogue", source: "System",
      text: `You defeated ${npc.name}! +${goldDrop} gold`
    });

    // Check combat quests
    const activeQuests = player.quests.filter((q: any) => !q.completed);
    for (const q of activeQuests) {
      if ((q.objectiveType === "combat" || q.objective === "combat") && (q.targetId === npc.id || q.targetId === npcInstanceId)) {
        const reward = this.questSystem.completeQuest(player, q.id);
        if (reward) this.broadcastQuestCompletion(socketId, q, reward);
      }
    }

    // Respawn NPC after delay
    const respawnKey = npcInstanceId;
    const homeX = npc.homePosition?.x ?? npc.position.x;
    const homeY = npc.homePosition?.y ?? npc.position.y;

    // Remove NPC temporarily
    this.npcSystem.removeNPC(npcInstanceId);

    // Schedule respawn
    this.npcRespawnTimers.set(respawnKey, {
      npcId: npc.id,
      x: homeX,
      y: homeY,
      timer: Date.now() + 15000 // 15 seconds respawn
    });
  }

  private handleInteract(id: string, player: any, msg: any) {
    const charName = this.socketToPlayer.get(id)!;
    if (!this.checkCooldown(charName, "interact", 500)) return;

    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);

    if (npc) {
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
      if (dist > 25) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Target is too far away." });
        return;
      }

      if (npc.shopId) {
        const shopItems = this.economySystem.getShop(npc.shopId);
        this.ws.sendToPlayer(id, { type: "shop_data", shopId: npc.shopId, items: shopItems, npcName: npc.name });
      }

      const interaction = this.npcSystem.handleInteraction(targetId, player, this.questSystem.getQuestDefinitions());
      if (interaction) {
        this.ws.sendToPlayer(id, {
          type: "dialogue",
          source: interaction.source,
          text: interaction.text,
          choices: interaction.choices,
          npcId: interaction.npcId
        });

        if (interaction.questId) {
          const quest = this.questSystem.startQuest(player, interaction.questId);
          if (quest) {
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Quest Started: ${quest.title || quest.name}` });
            this.debouncedSave();
          }
        }

        // Check quest completion
        const activeQuests = player.quests.filter((q: any) => !q.completed);
        for (const q of activeQuests) {
          let completed = false;
          if ((q.objectiveType === "talk_to" || q.objective === "talk_to") && q.targetNpcId === npc.id) {
            completed = true;
          } else if ((q.objectiveType === "collect" || q.objective === "collect") && q.targetNpcId === npc.id) {
            const count = player.inventory.filter((item: any) => item.id === q.requiredItemId).length;
            if (count >= (q.requiredCount || 1)) {
              for (let i = 0; i < (q.requiredCount || 1); i++) {
                const index = player.inventory.findIndex((item: any) => item.id === q.requiredItemId);
                if (index !== -1) player.inventory.splice(index, 1);
              }
              completed = true;
            } else {
              this.ws.sendToPlayer(id, {
                type: "dialogue", source: "System",
                text: `You need ${q.requiredCount || 1}x ${q.requiredItemId} to complete this quest.`
              });
            }
          }
          if (completed) {
            const reward = this.questSystem.completeQuest(player, q.id);
            if (reward) this.broadcastQuestCompletion(id, q, reward);
          }
        }
      }
    } else if (loot) {
      const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
      if (dist > 25) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      this.inventorySystem.addItem(player, loot.item);
      this.lootEntities.delete(targetId);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` });
      this.debouncedSave();
    }
  }

  private handleDialogueChoice(id: string, player: any, msg: any) {
    const { npcId, nodeId, choiceId } = msg;
    const interaction = this.npcSystem.handleChoice(npcId, nodeId, choiceId, player);
    if (interaction) {
      this.ws.sendToPlayer(id, {
        type: "dialogue",
        source: interaction.source,
        text: interaction.text,
        choices: interaction.choices,
        npcId: interaction.npcId
      });
      if (interaction.questId) {
        const quest = this.questSystem.startQuest(player, interaction.questId);
        if (quest) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Quest Started: ${quest.title || quest.name}` });
          this.debouncedSave();
        }
      }
    }
  }

  private handleUseItem(id: string, player: any, msg: any) {
    const itemId = msg.itemId;
    const index = player.inventory.findIndex((i: any) => i.id === itemId);
    if (index === -1) return;

    const itemDef = ItemRegistry.getItem(itemId);
    if (!itemDef || itemDef.type !== "consumable") return;

    const item = player.inventory[index];
    player.inventory.splice(index, 1);

    // Apply effects
    if ((itemDef as any).healAmount) {
      player.health = Math.min(player.maxHealth || 100, (player.health || 0) + (itemDef as any).healAmount);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Used ${itemDef.name}. +${(itemDef as any).healAmount} HP` });
    }
    if ((itemDef as any).manaAmount) {
      player.mana = Math.min(player.maxMana || 25, (player.mana || 0) + (itemDef as any).manaAmount);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Used ${itemDef.name}. +${(itemDef as any).manaAmount} Mana` });
    }
    if ((itemDef as any).staminaAmount) {
      player.stamina = Math.min(player.maxStamina || 100, (player.stamina || 0) + (itemDef as any).staminaAmount);
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Used ${itemDef.name}. +${(itemDef as any).staminaAmount} Stamina` });
    }

    this.debouncedSave();
  }

  private handleChat(id: string, player: any, msg: any) {
    const charName = this.socketToPlayer.get(id)!;
    const chatMsg = this.chatSystem.sendMessage(charName, player.name, msg.channel || "global", msg.text);
    if (chatMsg) {
      this.ws.broadcast({ type: "chat_message", ...chatMsg });
    }
  }

  private handleCraft(id: string, player: any, msg: any) {
    const result = this.craftingSystem.craft(player, msg.recipeId);
    if (result.success) {
      if (result.skillName && result.xp) {
        const skillResult = this.skillSystem.addXP(player, result.skillName, result.xp);
        if (skillResult.leveledUp) {
          this.ws.sendToPlayer(id, { type: "level_up", skill: result.skillName, level: skillResult.skill.level });
        }
      }
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Crafted ${result.item?.name || "item"}!` });
      this.debouncedSave();
    } else {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: result.reason || "Cannot craft." });
    }
  }

  private handleBuy(id: string, player: any, msg: any) {
    const result = this.economySystem.buyItem(player, msg.shopId || "general_store", msg.itemId);
    if (result.success) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Purchased item!` });
      this.debouncedSave();
    } else {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: result.reason || "Cannot buy." });
    }
  }

  private handleSell(id: string, player: any, msg: any) {
    const result = this.economySystem.sellItem(player, msg.itemId);
    if (result.success) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Sold for ${result.gold} gold!` });
      this.debouncedSave();
    } else {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: result.reason || "Cannot sell." });
    }
  }

  private checkCooldown(charName: string, action: string, cooldownMs: number): boolean {
    const now = Date.now();
    let times = this.lastActionTimes.get(charName);
    if (!times) {
      times = {};
      this.lastActionTimes.set(charName, times);
    }
    const last = times[action] || 0;
    if (now - last < cooldownMs) return false;
    times[action] = now;
    return true;
  }

  private broadcastQuestCompletion(socketId: string, quest: any, reward: any) {
    let rewardText = `Quest Completed: ${quest.title || quest.name}! +${reward.gold || 0} gold, +${reward.xp || 0} XP`;
    if (reward.itemId) {
      const itemDef = ItemRegistry.getItem(reward.itemId);
      if (itemDef) rewardText += `. Received: ${itemDef.name}`;
    }
    this.ws.sendToPlayer(socketId, { type: "dialogue", source: "System", text: rewardText });
    this.ws.sendToPlayer(socketId, { type: "quest_complete", questId: quest.id });
    this.debouncedSave();
  }

  private loadSpawns() {
    try {
      const spawnsPath = path.resolve(process.cwd(), "game-data/spawns/npc-spawns.json");
      if (fs.existsSync(spawnsPath)) {
        const spawnData = JSON.parse(fs.readFileSync(spawnsPath, "utf-8"));
        spawnData.forEach((region: any) => {
          region.spawns.forEach((spawn: any) => {
            this.npcSystem.createNPC(spawn.npcId, "", spawn.x, spawn.y);
          });
        });
      }
    } catch (error) {
      console.error("Error loading Spawn data:", error);
    }
  }

  async init() {
    await this.persistence.init();
    const savedData = await this.persistence.load();
    for (const name in savedData) {
      const player = savedData[name];
      if (!player.id) player.id = name;
      this.hydratePlayer(player);
      this.playerSystem.setPlayer(name, player);
    }
    console.log(`Loaded ${Object.keys(savedData).length} players from database.`);
    this.loadSpawns();
    console.log(`World initialized. NPCs: ${this.npcSystem.getAllNPCs().length}`);
  }

  private async debouncedSave() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.saveAll(), 2000);
  }

  async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id === "dummy_player") continue;
      const persistedPlayer = JSON.parse(JSON.stringify(p));
      this.stripPlayerItems(persistedPlayer);
      data[p.id] = persistedPlayer;
    }
    await this.persistence.save(data);
  }

  private hydratePlayer(player: any) {
    if (!player.id) player.id = "unknown";
    if (!player.name) player.name = player.id;
    if (!player.flags) player.flags = {};
    if (!player.position) player.position = { x: 0, y: 0, z: 0 };
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
    if (!player.skills) player.skills = {};
    if (player.health === undefined) player.health = 100;
    if (player.maxHealth === undefined) player.maxHealth = 100;
    if (player.stamina === undefined) player.stamina = 100;
    if (player.maxStamina === undefined) player.maxStamina = 100;
    if (player.mana === undefined) player.mana = 25;
    if (player.maxMana === undefined) player.maxMana = 25;
    if (player.gold === undefined) player.gold = 0;
    if (player.xp === undefined) player.xp = 0;
    if (player.level === undefined) player.level = 1;
    if (!player.role) player.role = player.name.toLowerCase() === "admin" ? "admin" : "player";

    if (player.inventory) {
      player.inventory = player.inventory.map((item: any) => ItemRegistry.hydrate(item));
    }
    if (player.equipment) {
      for (const slot in player.equipment) {
        if (player.equipment[slot]) {
          player.equipment[slot] = ItemRegistry.hydrate(player.equipment[slot]);
        }
      }
    }

    this.skillSystem.checkPlayerLevel(player);
  }

  private stripPlayerItems(player: any) {
    const strip = (item: any) => {
      if (!item || !item.id) return item;
      return { id: item.id };
    };
    if (player.inventory) {
      player.inventory = player.inventory.map(strip);
    }
    if (player.equipment) {
      for (const slot in player.equipment) {
        if (player.equipment[slot]) {
          player.equipment[slot] = strip(player.equipment[slot]);
        }
      }
    }
  }

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  tick() {
    this.tickCount += 1;
    const now = Date.now();

    // 1. Process continuous movement from held keys
    for (const [socketId, keys] of this.keysDown) {
      const charName = this.socketToPlayer.get(socketId);
      if (!charName) continue;
      const player = this.playerSystem.getPlayer(charName);
      if (!player) continue;

      let dx = 0, dy = 0;
      if (keys.has("w") || keys.has("ArrowUp")) dy -= 1;
      if (keys.has("s") || keys.has("ArrowDown")) dy += 1;
      if (keys.has("a") || keys.has("ArrowLeft")) dx -= 1;
      if (keys.has("d") || keys.has("ArrowRight")) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const speed = 3;
        player.position.x += dx * speed;
        player.position.y += dy * speed;
        this.observerEngine.updatePosition(socketId, { x: player.position.x, y: player.position.y });
      }
    }

    // 2. Update active chunks
    const observedChunks = this.observerEngine.getObservedChunks();
    const observedChunkIds = new Set(observedChunks.map(c => c.id));
    const allActive = this.chunkSystem.getActiveChunks();
    for (const chunk of allActive) {
      if (!observedChunkIds.has(chunk.id)) this.chunkSystem.setChunkActive(chunk.id, false);
    }
    for (const chunkInfo of observedChunks) {
      this.chunkSystem.getChunk(chunkInfo.chunkX, chunkInfo.chunkY);
      this.chunkSystem.setChunkActive(chunkInfo.id, true);
    }
    const activeChunks = this.chunkSystem.getActiveChunks();

    // 3. Regen stamina/health for all players (every 5 ticks = 0.5s)
    if (this.tickCount % 5 === 0) {
      const players = this.playerSystem.getAllPlayers();
      for (const p of players) {
        this.combatSystem.regenStamina(p);
        this.combatSystem.regenHealth(p, 0.5);
      }
    }

    // 4. Tick NPC AI
    const players = this.playerSystem.getAllPlayers();
    this.npcSystem.tick(players);
    this.worldSystem.tick();

    // 5. Process NPC respawns
    for (const [key, respawn] of this.npcRespawnTimers) {
      if (now >= respawn.timer) {
        this.npcSystem.createNPC(respawn.npcId, "", respawn.x, respawn.y);
        this.npcRespawnTimers.delete(key);
      }
    }

    // 6. Restock shops every 1000 ticks (100s)
    if (this.tickCount % 1000 === 0) {
      this.economySystem.restockShops();
    }

    // 7. Auto-remove old loot (5 minutes)
    for (const [lootId, loot] of this.lootEntities) {
      if (loot.createdAt && now - loot.createdAt > 300000) {
        this.lootEntities.delete(lootId);
      }
    }

    // 8. Update cache
    if (cache) {
      cache.set('world:stats', JSON.stringify({
        onlinePlayers: this.socketToPlayer.size,
        activeChunks: activeChunks.length,
        tick: this.tickCount,
        timestamp: now
      }), 'EX', 10);
    }

    // 9. Broadcast state
    const npcsWithGlb = this.npcSystem.getAllNPCs().map(npc => {
      let glbPath = this.glbRegistry.getModelForTarget("npc_single", npc.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("npc_group", npc.role);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("monster_group", npc.role);
      return { ...npc, glbPath };
    });

    const lootWithGlb = Array.from(this.lootEntities.values()).map(loot => {
      let glbPath = this.glbRegistry.getModelForTarget("object_single", loot.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("object_group", loot.item?.id);
      return { ...loot, glbPath };
    });

    const weather = this.worldSystem.weatherSystem.nextWeather(Math.floor(this.tickCount / 600));

    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      weather,
      activeChunkIds: activeChunks.map(c => c.id),
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        health: p.health,
        maxHealth: p.maxHealth || 100,
        stamina: p.stamina || 100,
        maxStamina: p.maxStamina || 100,
        mana: p.mana || 25,
        maxMana: p.maxMana || 25,
        gold: p.gold || 0,
        xp: p.xp || 0,
        level: p.level || 1,
        role: p.role,
        inventory: p.inventory || [],
        equipment: p.equipment || {},
        reputation: p.reputation || {},
        questStatus: this.questSystem.getQuestStatus(p)
      })),
      npcs: npcsWithGlb,
      loot: lootWithGlb,
      onlinePlayers: this.socketToPlayer.size
    });

    // Auto-save every 300 ticks (30s)
    if (this.tickCount % 300 === 0) {
      this.saveAll();
    }

    if (this.tickCount % 100 === 0) {
      console.log(`Tick ${this.tickCount} | Players: ${this.socketToPlayer.size} | NPCs: ${npcsWithGlb.length} | Chunks: ${activeChunks.length}`);
    }
  }
}
