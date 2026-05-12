// Alias for backwards compatibility
import { WorldPlacementRuleEngine } from "../world/services/WorldPlacementRuleEngine.js";
const PlacementEngine = WorldPlacementRuleEngine;

import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { LegendPropagationSystem } from "../systems/LegendPropagationSystem.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { verifyFirebaseToken } from "../config/firebase.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { cache } from "./Cache.js";
import fs from "fs";
import path from "path";

import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import { SkillSystem } from "../modules/skill/SkillSystem.js";
import { LootSystem } from "../modules/loot/LootSystem.js";
import { ChatSystem } from "../modules/chat/ChatSystem.js";
import { ResourceSystem } from "../modules/world/ResourceSystem.js";
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { LiveHealEngine } from "./liveheal/LiveHealEngine.js";
import { AssetHealthService } from "../assets/AssetHealthService.js";
import { GameConfig } from "../config/GameConfig.js";
import { characterAssembly } from "../modules/character/CharacterAssemblySystem.js";

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
  public craftingSystem: CraftingSystem;
  public skillSystem: SkillSystem;
  public lootSystem: LootSystem;
  public chatSystem: ChatSystem;
  public resourceSystem: ResourceSystem;
  public assetPoolResolver: AssetPoolResolver;
  public liveHeal: LiveHealEngine;
  public assetHealthService: AssetHealthService;

  private lootEntities: Map<string, any> = new Map();
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  public playerToSocket: Map<string, string> = new Map(); // characterName -> socketId
  private lastActionTimes: Map<string, any> = new Map(); // charName -> actionMap
  private npcRespawnTimers: Map<string, any> = new Map();
  private keysDown: Map<string, Set<string>> = new Map();

  public worldState: any = {
    weather: "clear",
    timeOfDay: 12,
    customDialogues: {},
    nations: [],
    diplomacy: [],
    territories: {},
    bannedPlayers: [],
    mutedPlayers: []
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
    this.persistence = new PersistenceManager();
    this.worldSystem = new WorldSystem(this.persistence);
    this.glbRegistry = new GLBRegistry();
    this.craftingSystem = new CraftingSystem();
    this.skillSystem = new SkillSystem();
    this.lootSystem = new LootSystem();
    this.chatSystem = new ChatSystem();
    this.resourceSystem = new ResourceSystem();
    this.assetPoolResolver = new AssetPoolResolver();
    this.liveHeal = new LiveHealEngine();
    this.assetHealthService = new AssetHealthService({} as any); // Mock adapter

    // Create a dummy player in a distant chunk to prove multi-observer union
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });

    this.ws.onPlayerConnect = (id) => {
      console.log(`Socket ${id} connected. Waiting for login...`);
    };

    this.ws.onPlayerDisconnect = async (id) => {
      const uid = this.socketToPlayer.get(id);
      if (uid) {
        const player = this.playerSystem.getPlayer(uid);
        if (player) {
          player.isOffline = true;
          player.state = "idle";
          player.stateTimer = Date.now() + 5000;
        }
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        if (player) this.playerToSocket.delete(player.name);
        await this.saveAll();
        if (player) console.log(`Player ${player.name} (Socket ${id}) disconnected. Character remains in world.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
       await this.handleMessage(id, msg);
    };
  }

  public getPersistenceStats() {
    return {
      status: "connected",
      driver: this.persistence.getDriverName(),
      playerCount: this.playerSystem.getAllPlayers().length
    };
  }

  public getPlaytesterDebugLogPath() {
    return path.join(process.cwd(), "logs/playtester-debug.log");
  }

  public buildPlaytesterMonitorPayload(options: any) {
    return {
      tick: this.tickCount,
      players: this.playerSystem.getAllPlayers().length,
      npcs: this.npcSystem.getAllNPCs().length,
      ...options
    };
  }

  public debouncedSave() {
    // Basic implementation for now
    this.saveAll().catch(e => console.error("Debounced save failed:", e));
  }

  public createNPC(id: string, name: string, x: number, y: number) {
    return this.npcSystem.createNPC(id, name, x, y);
  }

  public createLoot(id: string, item: any, pos: { x: number, y: number }) {
    this.lootEntities.set(id, { id, item, position: pos });
  }

  public updateLootCache() {
    // Logic to sync loot state
  }

  private async handleMessage(id: string, msg: any) {
    if (msg.type === "login") {
      return this.handleLogin(id, msg);
    }

    const playerId = this.socketToPlayer.get(id);
    if (!playerId) return;
    const player = this.playerSystem.getPlayer(playerId);
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
        if (!this.checkCooldown(playerId, "equip", 500)) return;
        this.inventorySystem.equipItem(player, msg.itemId);
        this.debouncedSave();
        break;
      case "unequip":
        if (!this.checkCooldown(playerId, "equip", 500)) return;
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
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.sendToPlayer(id, { type: "admin_glb_scan_result", models: this.glbRegistry.scanModels() });
        break;
      case "admin_glb_list":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
        break;
      case "admin_glb_link":
        if (player.role !== "admin" && player.role !== "gm") return;
        this.glbRegistry.addLink({ glbPath: msg.glbPath, targetType: msg.targetType, targetId: msg.targetId });
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links: this.glbRegistry.getLinks() });
        break;
      case "admin_glb_unlink":
        if (player.role !== "admin" && player.role !== "gm") return;
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
        this.createNPC(spawnId, msg.name || msg.npcId, msg.x || 40, msg.y || 40);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Spawned NPC: ${spawnId}` });
        break;
      }

      case "gm_spawn_npc_at_self": {
        if (player.role !== "admin" && player.role !== "gm") return;
        const selfSpawnId = `${msg.npcId}_${Date.now()}`;
        this.createNPC(selfSpawnId, msg.npcId, player.position.x + 5, player.position.y + 5);
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

  private async handleLogin(id: string, msg: any) {
    if (msg.token) {
        try {
          const decodedToken = await verifyFirebaseToken(msg.token);
          if (decodedToken) {
            const uid = decodedToken.uid;
            const charName = decodedToken.name || decodedToken.email?.split('@')[0] || `Player_${uid.substring(0,6)}`;
            let player = this.playerSystem.getPlayer(uid);
            if (!player) {
                player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance);
                this.hydratePlayer(player);
            }
            player.isOffline = false;
            this.socketToPlayer.set(id, uid);
            this.playerToSocket.set(uid, id);
            this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
            this.ws.sendToPlayer(id, { type: "welcome", id: uid, stats: { gold: player.gold, xp: player.xp } });
            return;
          }
        } catch (e) {
          console.error("Login failed", e);
        }
    }

    const charName = msg.name || `Guest_${id.substring(0, 4)}`;
    let player = await this.persistence.load(); // Dummy load for now
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
        inventory: player.inventory,
        equipment: player.equipment,
        quests: player.quests,
        position: player.position
      }
    });

    this.ws.broadcast({ type: "chat_message", sender: "System", text: `${charName} has entered the world.` });
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
    let dx = Number(msg.dx) || 0;
    let dy = Number(msg.dy) || 0;
    const magSq = dx * dx + dy * dy;
    if (magSq > 1) {
      const mag = Math.sqrt(magSq);
      dx /= mag;
      dy /= mag;
    }
    if (!isNaN(dx) && !isNaN(dy)) {
      player.position.x += dx * speed;
      player.position.y += dy * speed;
      this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
    }
  }

  private handleAttack(id: string, player: any, msg: any) {
    const playerId = this.socketToPlayer.get(id)!;
    if (!this.checkCooldown(playerId, "attack", 800)) return;

    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    if (!npc || npc.health === undefined) return;

    const dx = player.position.x - npc.position.x;
    const dy = player.position.y - npc.position.y;
    if (dx * dx + dy * dy > GameConfig.attackDistance * GameConfig.attackDistance) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Target is too far away." });
      return;
    }

    const result = this.combatSystem.attack(player, npc);

    if (!result.success) {
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Not enough stamina!" });
      return;
    }

    if (result.xpGained > 0) {
      this.skillSystem.addXP(player, "combat", result.xpGained);
    }

    this.ws.broadcast({
      type: "combat_feedback",
      targetId,
      attackerId: player.id,
      damage: result.damage,
      health: result.defenderHealth,
      maxHealth: result.defenderMaxHealth
    });

    if (npc.health <= 0) {
      this.handleNPCDeath(id, player, npc, targetId);
    }
  }

  private handleNPCDeath(socketId: string, player: any, npc: any, npcInstanceId: string) {
    const lootResult = this.lootSystem.rollLoot(npc.dropTable || []);

    for (const item of lootResult.items) {
      const lootId = `loot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      this.createLoot(lootId, item, {
        x: npc.position.x + (Math.random() - 0.5) * 5,
        y: npc.position.y + (Math.random() - 0.5) * 5
      });
    }

    if (lootResult.gold > 0) {
      this.economySystem.addGold(player, lootResult.gold);
    }

    this.ws.sendToPlayer(socketId, {
      type: "dialogue", source: "System",
      text: `You defeated ${npc.name}! +${lootResult.gold} gold`
    });

    this.updateLootCache();
    this.npcSystem.removeNPC(npcInstanceId);
    this.npcRespawnTimers.set(npcInstanceId, {
      npcId: npc.id,
      x: npc.position.x,
      y: npc.position.y,
      timer: Date.now() + 15000
    });
  }

  private handleInteract(id: string, player: any, msg: any) {
    const playerId = this.socketToPlayer.get(id)!;
    if (!this.checkCooldown(playerId, "interact", 500)) return;

    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);
    const resource = this.resourceSystem.nodes.get(targetId);

    if (npc) {
      const dx = player.position.x - npc.position.x;
      const dy = player.position.y - npc.position.y;
      if (dx * dx + dy * dy > GameConfig.interactDistance * GameConfig.interactDistance) {
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
      }
    } else if (loot) {
      this.inventorySystem.addItem(player, loot.item);
      this.lootEntities.delete(targetId);
      this.updateLootCache();
      this.debouncedSave();
    } else if (resource) {
      const gatherResult = this.resourceSystem.gatherNode(targetId);
      if (gatherResult.success) {
        this.inventorySystem.addItem(player, gatherResult.item);
      }
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
    }
  }

  private handleUseItem(id: string, player: any, msg: any) {
    this.debouncedSave();
  }

  private handleChat(id: string, player: any, msg: any) {
    this.ws.broadcast({ type: "chat_message", sender: player.name, text: msg.text });
  }

  private handleCraft(id: string, player: any, msg: any) {
    this.debouncedSave();
  }

  private handleBuy(id: string, player: any, msg: any) {
    this.economySystem.buyItem(player, msg.shopId || "general_store", msg.itemId);
    this.debouncedSave();
  }

  private handleSell(id: string, player: any, msg: any) {
    this.economySystem.sellItem(player, msg.itemId);
    this.debouncedSave();
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
    this.ws.sendToPlayer(socketId, {
      type: "dialogue",
      source: "System",
      text: `Quest Completed: ${quest.name}!`
    });
    this.saveAll();
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
    if (this.persistence) {
      try {
        await this.persistence.init();
      } catch (err) {
        console.warn("[WorldTick.init] Persistence init failed:", err);
      }
    }
    this.loadSpawns();
  }

  async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      data[p.id] = p;
    }
    await this.persistence.save(data);
  }

  private hydratePlayer(player: any) {
    if (!player.position) player.position = { x: 0, y: 0, z: 0 };
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
  }

  private stripPlayerItems(player: any) {
    // Logic to strip items
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

    const dummyPlayer = this.playerSystem.getPlayer("dummy_player");
    if (dummyPlayer) {
      dummyPlayer.position.x = 500 + Math.sin(this.tickCount * 0.1) * 50;
    }

    const observedChunks = this.observerEngine.getObservedChunks();
    const observedChunkIds = new Set(observedChunks.chunks.map(c => c.id));

    const allActive = this.chunkSystem.getActiveChunks();
    for (const chunk of allActive) {
      if (!observedChunkIds.has(chunk.id)) {
        this.chunkSystem.setChunkActive(chunk.id, false);
      }
    }

    for (const chunkInfo of observedChunks.chunks) {
      this.chunkSystem.getChunk(chunkInfo.chunkX, chunkInfo.chunkY);
      this.chunkSystem.setChunkActive(chunkInfo.id, true);
    }

    const activeChunks = this.chunkSystem.getActiveChunks();

    if (cache) {
      cache.set('world:stats', JSON.stringify({
        onlinePlayers: this.playerSystem.getAllPlayers().length,
        activeChunks: activeChunks.length,
        tick: this.tickCount,
        timestamp: Date.now()
      }), 'EX', 10);
    }

    const allPlayers = this.playerSystem.getAllPlayers();
    const onlinePlayers = allPlayers.filter(p => !p.isOffline);

    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    LegendPropagationSystem.update();
    this.worldSystem.tick();

    const npcsWithGlb = this.npcSystem.getAllNPCs().map(npc => {
      let glbPath = this.glbRegistry.getModelForTarget("npc_single", npc.id);
      return { ...npc, glbPath };
    });

    const lootWithGlb = Array.from(this.lootEntities.values()).map(loot => {
      return { ...loot, glbPath: null };
    });

    const worldObjectsWithGlb = this.worldSystem.objectSystem.getAllObjects().map(obj => {
      return { ...obj, glbPath: obj.glbPath };
    });

    if (this.tickCount % 600 === 0) {
      this.saveAll().catch(e => console.error("Periodic save failed:", e));
    }

    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      worldTime: this.worldSystem.getFormattedTime(),
      activeChunkIds: activeChunks.map(c => c.id),
      players: allPlayers.map(p => ({ ...p, questStatus: this.questSystem.getQuestStatus(p) })),
      npcs: npcsWithGlb,
      loot: lootWithGlb,
      worldObjects: worldObjectsWithGlb
    });
  }
}
