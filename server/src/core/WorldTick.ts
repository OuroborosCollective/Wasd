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
  private lootEntities: Map<string, any> = new Map();

  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  private lastActionTimes: Map<string, any> = new Map();

  public assetPoolResolver: any = {
    getDocument: () => ({}),
    setEntry: () => true,
    removeEntry: () => true,
    setDefault: () => true,
    removeDefault: () => true,
    reload: () => true,
  };
  public getPersistenceStats(): any { return {}; }
  public placementEngine: any = {};
  public listActiveVoteBanners(): any { return []; }
  public handleVoteProviderCallback(data: any): any { return { ok: true }; }
  public getAdminVoteBanners(): any { return []; }
  public upsertVoteBanner(data: any): any { return { ok: true }; }
  public deleteVoteBanner(id: any): any { return { ok: true }; }
  public setVoteBannerOrder(data: any): any { return { ok: true }; }
  public getVoteAdminDiagnostics(): any { return {}; }
  public debouncedSave(): void {}
  public craftingSystem: any = {};
  public skillSystem: any = {};
  public worldState: any = { customDialogues: {} };
  public createNPC(id: any, name: any, x: any, y: any): void {}
  public playerToSocket: Map<string, string> = new Map();
  public updateLootCache(): void {}
  public npcRespawnTimers: Map<string, any> = new Map();
  public resourceSystem: any = { nodes: new Map() };
  public chatSystem: any = { getRecentMessages: () => [], systemMessage: () => {}, sendMessage: () => ({}) };
  public lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  public liveHeal(p1: any, p2: any): void {}
  public getPlaytesterDebugLogPath(): string { return ""; }
  public buildPlaytesterMonitorPayload(): any { return {}; }
  public assetHealthService: any = { getStatus: () => ({}) };
  private keysDown: Map<string, Set<string>> = new Map();

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
        await this.saveAll();
        console.log(`Player ${player?.name} (Socket ${id}) disconnected.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      if (msg.type === "login") {
        if (!msg.token) {
          this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: No token provided" });
          setTimeout(() => {
            const client = Array.from((this.ws as any).wss.clients).find((c: any) => c.id === id);
            if (client) (client as any).close();
          }, 500);
          return;
        }

        let charName = "Unknown";
        let uid = "";

        try {
          const decodedToken = await verifyFirebaseToken(msg.token) as any;
          if (decodedToken) {
            uid = decodedToken.uid;
            charName = decodedToken.name || decodedToken.email?.split('@')[0] || `Player_${uid.substring(0, 6)}`;
          } else {
            this.ws.sendToPlayer(id, { type: "error", message: "Authentication service unavailable" });
            return;
          }
        } catch (e) {
          this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: Invalid token" });
          return;
        }

        let player = this.playerSystem.getPlayer(uid);
        if (!player) {
          player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance);
          this.hydratePlayer(player);
        } else {
          player.isOffline = false;
        }

        if (player.name !== charName) player.name = charName;
        this.socketToPlayer.set(id, uid);
        this.playerToSocket.set(uid, id);
        this.observerEngine.register(id, { x: player.position.x, y: player.position.y });

        this.ws.sendToPlayer(id, {
          type: "welcome",
          id: uid,
          stats: {
            gold: player.gold,
            xp: player.xp,
            inventory: player.inventory,
            equipment: player.equipment,
            quests: player.quests
          }
        });
        return;
      }

      const playerId = this.socketToPlayer.get(id);
      if (!playerId) return;

      const player = this.playerSystem.getPlayer(playerId);
      if (!player) return;

      const charName = player.name;
      const now = Date.now();
      const checkCooldown = (cooldown: number) => {
        const pTimes = this.lastActionTimes.get(charName) || {};
        const last = pTimes["general"] || 0;
        if (now - last < cooldown) return false;
        pTimes["general"] = now;
        this.lastActionTimes.set(charName, pTimes);
        return true;
      };

      if (msg.type === "move_intent") {
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
      } else if (msg.type === "chat") {
        if (msg.text && typeof msg.text === "string" && msg.text.trim().length > 0) {
          this.ws.broadcast({ type: "chat_message", source: player.name, text: msg.text.trim() });
        }
      } else if (msg.type === "attack") {
        if (!checkCooldown(800)) return;
        this.handleAttack(id, player, msg);
      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        this.handleInteract(id, player, msg);
      } else if (msg.type === "dialogue_choice") {
        this.handleDialogueChoice(id, player, msg);
      } else if (msg.type === "equip") {
        this.inventorySystem.equipItem(player, msg.itemId);
        this.saveAll();
      } else if (msg.type === "unequip") {
        this.inventorySystem.unequipItem(player, msg.slot);
        this.saveAll();
      } else if (msg.type === "drop") {
        this.inventorySystem.removeItem(player, msg.itemId);
        this.saveAll();
      }
    };
  }

  private handleAttack(id: string, player: any, msg: any) {
    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    if (npc && npc.health !== undefined) {
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
      if (dist < 30) {
        const baseDamage = 10;
        npc.health -= baseDamage;
        this.ws.broadcast({
          type: "combat_feedback",
          targetId,
          damage: baseDamage,
          health: npc.health,
          maxHealth: npc.maxHealth
        });
        if (npc.health <= 0) {
          this.handleNPCDeath(id, player, npc, targetId);
        }
      }
    }
  }

  private handleInteract(id: string, player: any, msg: any) {
    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);
    if (npc) {
      const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
      if (dist < 20) {
        const interaction = this.npcSystem.handleInteraction(targetId, player, this.questSystem.getQuestDefinitions());
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
    } else if (loot) {
      const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
      if (dist < 20) {
        this.inventorySystem.addItem(player, loot.item);
        this.lootEntities.delete(targetId);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` });
      }
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

  private handleNPCDeath(socketId: string, player: any, npc: any, npcInstanceId: string) {
    npc.health = npc.maxHealth || 100;
    this.ws.sendToPlayer(socketId, { type: "dialogue", source: "System", text: `${npc.name} respawns.` });
  }

  private hydratePlayer(player: any) {
    if (!player.id) player.id = "unknown";
    if (!player.name) player.name = player.id;
    if (!player.position) player.position = { x: 0, y: 0 };
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
  }

  private async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id !== "dummy_player") data[p.id] = p;
    }
    await this.persistence.save(data);
  }

  private createLoot(id: string, item: any, pos: { x: number, y: number }) {
    this.lootEntities.set(id, { id, item, position: pos });
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
    const observedChunks = this.observerEngine.getObservedChunks();
    const activeChunks = this.chunkSystem.getActiveChunks();
    const allPlayers = this.playerSystem.getAllPlayers();
    
    this.npcSystem.tick(allPlayers.filter(p => !p.isOffline), this.worldSystem.worldTime);
    this.worldSystem.tick();

    if (this.tickCount % 600 === 0) {
      this.saveAll().catch(e => console.error(e));
    }

    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      players: allPlayers,
      npcs: this.npcSystem.getAllNPCs(),
      loot: Array.from(this.lootEntities.values())
    });
  }
}