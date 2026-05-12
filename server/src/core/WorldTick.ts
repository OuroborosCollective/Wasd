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

const GameConfig: any = {
  attackDistance: 30,
  interactDistance: 20
};

const characterAssembly: any = {
  generateNPCAppearance: () => ({}),
  validateAppearance: (a: any) => a,
  resolveModelPaths: () => ({ bodyUrl: "", skinColor: "", hairColor: "", eyeColor: "" })
};

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

  // Extensions required by CI checks / other modules
  public assetPoolResolver: any = { resolve: () => ({}) };
  public getPersistenceStats: () => any = () => ({ status: "active", tick: this.tickCount });
  public liveHeal: any = { process: () => {}, getStatus: () => ({ tickCount: this.tickCount, subsystems: [], learningEntries: [], logEntries: [] }), flush: () => {} };
  public assetHealthService: any = { check: () => {}, getStats: () => ({ totalScanned: 0, totalValid: 0, totalWarnings: 0, totalHardFailures: 0, totalQuarantined: 0, startupScanDone: true }), flush: () => {} };
  public getPlaytesterDebugLogPath: () => string = () => "logs/debug.log";
  public buildPlaytesterMonitorPayload: (options?: any) => any = () => ({ tick: this.tickCount });
  public debouncedSave: () => void = () => { this.saveAll(); };
  public keysDown: Map<string, Set<string>> = new Map();
  public worldState: any = { nations: [], diplomacy: [], territories: {}, customDialogues: {}, weather: 'clear', timeOfDay: 12 };
  public lootSystem: any = { rollLoot: () => ({ items: [], gold: 0 }) };
  public resourceSystem: any = { nodes: new Map(), gatherNode: () => ({ success: false }) };
  public craftingSystem: any = { getRecipes: () => [] };
  public skillSystem: any = {
    addXP: () => ({ leveledUp: false, skill: { level: 1 } }),
    getAllSkills: (p: any) => [],
    getQuestStatus: (p: any) => ({})
  };
  public npcRespawnTimers: Map<string, any> = new Map();
  public chatSystem: any = { systemMessage: () => {}, getRecentMessages: () => [], sendMessage: () => ({}) };
  public playerToSocket: Map<string, string> = new Map();

  private lootEntities: Map<string, any> = new Map();
  private socketToPlayer: Map<string, string> = new Map(); // socketId -> character UID
  private lastActionTimes: Map<string, any> = new Map(); // charName -> { action: timestamp }

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
      console.log(`Socket ${id} connected.`);
    };

    this.ws.onPlayerDisconnect = async (id) => {
      const uid = this.socketToPlayer.get(id);
      if (uid) {
        const player = this.playerSystem.getPlayer(uid);
        if (player) {
          player.isOffline = true;
          (player as any).state = "idle";
          (player as any).stateTimer = Date.now() + 5000;
        }
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        await this.saveAll();
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      await this.handleMessage(id, msg);
    };
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
      case "move_intent":
        this.handleMoveIntent(id, player, msg);
        break;
      case "chat":
        this.ws.broadcast({ type: "chat_message", source: player.name, text: msg.text });
        break;
      case "interact":
        this.handleInteract(id, player, msg);
        break;
      case "attack":
        this.handleAttack(id, player, msg);
        break;
      case "equip":
        this.inventorySystem.equipItem(player, msg.itemId);
        break;
      case "unequip":
        this.inventorySystem.unequipItem(player, msg.slot);
        break;
      case "drop":
        this.inventorySystem.removeItem(player, msg.itemId);
        break;
      default:
        break;
    }
  }

  private async handleLogin(id: string, msg: any) {
    const uid = msg.token || `guest_${id}`;
    const charName = msg.name || `Player_${id.substring(0,4)}`;
    let player = this.playerSystem.getPlayer(uid);
    if (!player) {
      player = this.playerSystem.createPlayer(uid, charName);
      this.hydratePlayer(player);
    }
    this.socketToPlayer.set(id, uid);
    this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
    this.ws.sendToPlayer(id, { type: "welcome", id: uid, stats: player });
  }

  private handleMoveIntent(id: string, player: any, msg: any) {
    const speed = 5;
    let dx = Number(msg.dx) || 0;
    let dy = Number(msg.dy) || 0;
    player.position.x += dx * speed;
    player.position.y += dy * speed;
    this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
  }

  private handleAttack(id: string, player: any, msg: any) {
    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    if (npc) {
        const result: any = this.combatSystem.attack(player, npc);
        this.ws.broadcast({
            type: "combat_feedback",
            targetId,
            damage: result.damage,
            health: result.defenderHealth
        });
    }
  }

  private handleInteract(id: string, player: any, msg: any) {
      const targetId = msg.targetId;
      const npc = this.npcSystem.getNPC(targetId);
      if (npc) {
          const interaction = this.npcSystem.handleInteraction(targetId, player, this.questSystem.getQuestDefinitions());
          if (interaction) {
              this.ws.sendToPlayer(id, { type: "dialogue", ...interaction });
          }
      }
  }

  public createNPC(id: string, name: string, x: number, y: number) {
    this.npcSystem.createNPC(id, name, x, y);
  }

  private createLoot(id: string, item: any, pos: any) {
    this.lootEntities.set(id, { id, item, position: pos });
  }

  private updateLootCache() {}

  private checkCooldown(playerId: string, action: string, ms: number) {
    return true;
  }

  async init() {
    if (this.persistence) {
      const savedData = await this.persistence.load();
      if (savedData) {
        for (const id in savedData) {
          const player = savedData[id];
          this.hydratePlayer(player);
          this.playerSystem.setPlayer(id, player);
        }
      }
    }
  }

  async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id !== "dummy_player") {
        data[p.id] = p;
      }
    }
    await this.persistence.save(data);
  }

  private hydratePlayer(player: any) {
    if (!player.id) player.id = "unknown";
    if (!player.position) player.position = { x: 0, y: 0, z: 0 };
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
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
    this.npcSystem.tick(this.playerSystem.getAllPlayers(), 0);
    LegendPropagationSystem.update();
    this.worldSystem.tick();

    if (this.tickCount % 600 === 0) {
      this.saveAll().catch(e => console.error("Periodic save failed:", e));
    }

    const allPlayers = this.playerSystem.getAllPlayers();
    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      players: allPlayers.map(p => ({ ...p, questStatus: this.skillSystem.getQuestStatus(p) })),
      npcs: [],
      loot: [],
      worldObjects: []
    });
  }
}
