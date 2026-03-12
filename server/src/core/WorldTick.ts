import { ChunkSystem } from "../modules/world/ChunkSystem.js";
import { ObserverEngine } from "../modules/observer/ObserverEngine.js";
import { PlayerSystem } from "../modules/player/PlayerSystem.js";
import { CombatSystem } from "../modules/combat/CombatSystem.js";
import { InventorySystem } from "../modules/inventory/InventorySystem.js";
import { NPCSystem } from "../modules/npc/NPCSystem.js";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { EconomySystem } from "../modules/economy/EconomySystem.js";
import { MatrixEnergySystem } from "../modules/economy/MatrixEnergySystem.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import { QuestEngine } from "../modules/quest/QuestEngine.js";
import { WorldSystem } from "../modules/world/WorldSystem.js";
import { HeuristicWorldBrain } from "../modules/brain/HeuristicWorldBrain.js";
import { WorldEditorServer } from "../modules/world-editor/WorldEditorServer.js";
import { DudenregisterHistory } from "../modules/history/DudenregisterHistory.js";
import { SkillSystem } from "../modules/skill/SkillSystem.js";
import { SessionRegistry } from "../modules/auth/SessionRegistry.js";
import { OracleEngine } from "../modules/oracle/OracleEngine.js";
import { PersistenceManager } from "./PersistenceManager.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
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
  public matrixEnergy: MatrixEnergySystem;
  public editor: WorldEditorServer;
  public dudenregister: DudenregisterHistory;
  public skillSystem: SkillSystem;
  public craftingSystem: CraftingSystem;
  public sessionRegistry: SessionRegistry;
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public worldBrain: HeuristicWorldBrain;
  public oracle: OracleEngine;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  private lootEntities: Map<string, any> = new Map();

  private socketToPlayer: Map<string, string> = new Map();

  constructor(private ws: GameWebSocketServer) {
    this.chunkSystem = new ChunkSystem(64);
    this.observerEngine = new ObserverEngine();
    this.playerSystem = new PlayerSystem();
    this.combatSystem = new CombatSystem();
    this.inventorySystem = new InventorySystem();
    this.npcSystem = new NPCSystem();
    this.skillSystem = new SkillSystem();
    this.editor = new WorldEditorServer(this.npcSystem, this.lootEntities);
    this.dudenregister = new DudenregisterHistory();
    this.sessionRegistry = new SessionRegistry();
    this.guildSystem = new GuildSystem();
    this.matrixEnergy = new MatrixEnergySystem();
    this.economySystem = new EconomySystem();
    this.craftingSystem = new CraftingSystem(this.matrixEnergy);
    this.questSystem = new QuestEngine();
    this.worldSystem = new WorldSystem();
    this.worldBrain = new HeuristicWorldBrain();
    this.oracle = new OracleEngine();
    this.persistence = new PersistenceManager();
    this.glbRegistry = new GLBRegistry();

    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });

    this.ws.onPlayerConnect = (id) => { console.log(`Socket ${id} connected.`); };

    this.ws.onPlayerDisconnect = async (id) => {
      const charName = this.socketToPlayer.get(id);
      if (charName) {
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        await this.saveAll();
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      const charName = this.socketToPlayer.get(id);
      const player = charName ? this.playerSystem.getPlayer(charName) : null;

      if (msg.type === "login") {
        const name = msg.name || `Guest_${id.substring(0, 4)}`;
        if (msg.token && this.sessionRegistry.get(msg.token)) {
          const session = this.sessionRegistry.get(msg.token);
          console.log(`Reconnecting session for ${session.name}`);
          // ... handle logic ...
        }
        let p = this.playerSystem.getPlayer(name);
        if (!p) {
          p = this.playerSystem.createPlayer(name, name);
          this.hydratePlayer(p);
        }
        this.sessionRegistry.set(name, { id, name, lastActive: Date.now() });
        this.socketToPlayer.set(id, name);
        this.observerEngine.register(id, { x: p.position.x, y: p.position.y });
        this.ws.sendToPlayer(id, {
          type: "welcome",
          id: name,
          stats: { gold: p.gold, xp: p.xp, matrixEnergy: this.matrixEnergy.getBalance(name), inventory: p.inventory, equipment: p.equipment, quests: p.quests }
        });
      } else if (msg.type === "move_intent" && player) {
        player.position.x += msg.dx * 2;
        player.position.y += msg.dy * 2;
        this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
      } else if (msg.type === "attack" && player) {
        const target = this.npcSystem.getNPC(msg.targetId);
        if (target) {
          const res = this.combatSystem.attack(player, target);
          if (res.hit) {
            this.ws.sendToPlayer(id, { type: "combat_feedback", targetId: target.id, damage: res.damage });
            this.skillSystem.addXP(player, "combat", 10);
            this.skillSystem.addXP(player, "strength", 5);
            if (target.health <= 0) {
              this.dudenregister.record({ type: "kill", detail: `${player.name} killed ${target.name}`, actorId: player.id });
              this.lootEntities.set(`loot_${Date.now()}`, { id: `loot_${Date.now()}`, position: { ...target.position }, item: ItemRegistry.createInstance("iron_scrap") });
            }
          }
        }
      } else if (msg.type === "interact" && player) {
        const target = this.npcSystem.getNPC(msg.targetId);
        if (target) {
          const interaction = this.npcSystem.handleInteraction(target.id, player);
          if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", ...interaction });
        }
      } else if (msg.type === "trade" && player) {
        const res = this.economySystem.trade("main_market", msg.itemId, msg.amount, player.reputation["Merchant League"] || 0);
        if (res) this.ws.sendToPlayer(id, { type: "trade_result", ...res });
      } else if (msg.type === "admin_command" && player?.role === "admin") {
        const res = this.editor.execute(msg.command);
        this.ws.sendToPlayer(id, { type: "admin_feedback", result: res });
      } else if (msg.type === "dialogue_choice" && player) {
        const interaction = this.npcSystem.handleChoice(msg.npcId, msg.nodeId, msg.choiceId, player);
        if (interaction) this.ws.sendToPlayer(id, { type: "dialogue", ...interaction });
      } else if (msg.type === "craft" && player) {
        const res = this.craftingSystem.craft(player, msg.recipe);
        if (res.success) this.ws.sendToPlayer(id, { type: "craft_result", ...res });
        this.dudenregister.record({ type: "craft", detail: `${player.name} crafted ${msg.recipe.resultId}`, actorId: player.id });
      }
    };
  }

  async init() {
    const savedData = await this.persistence.load();
    for (const name in savedData) {
      const p = savedData[name];
      this.hydratePlayer(p);
      this.playerSystem.setPlayer(name, p);
    }
    this.economySystem.registerMarket("main_market");
    this.loadSpawns();
  }

  private loadSpawns() {
    const spawnsPath = path.resolve(process.cwd(), "game-data/spawns/npc-spawns.json");
    if (fs.existsSync(spawnsPath)) {
      const spawnData = JSON.parse(fs.readFileSync(spawnsPath, "utf-8"));
      spawnData.forEach((region: any) => region.spawns.forEach((s: any) => this.npcSystem.createNPC(s.npcId, "", s.x, s.y)));
    }
  }

  async saveAll() {
    const players = this.playerSystem.getAllPlayers();
    const data: any = {};
    players.forEach(p => { if(p.id !== "dummy_player") data[p.id] = p; });
    await this.persistence.save(data);
    await this.persistence.saveChunks(this.chunkSystem.getActiveChunks());
    await this.persistence.saveNPCs(this.npcSystem.getAllNPCs());
  }

  private hydratePlayer(p: any) {
    p.position = p.position || { x: 0, y: 0, z: 0 };
    p.inventory = p.inventory || [];
    p.equipment = p.equipment || { weapon: null };
    p.quests = p.quests || [];
    p.flags = p.flags || {};
    p.reputation = p.reputation || {};
  }

  start() { this.timer = setInterval(() => this.tick(), 100); }

  tick() {
    this.tickCount++;
    const players = this.playerSystem.getAllPlayers();
    
    const observed = this.observerEngine.getObservedChunks();
    observed.forEach(c => {
      this.chunkSystem.getChunk(c.chunkX, c.chunkY);
      this.chunkSystem.setChunkActive(c.id, true);
    });

    this.npcSystem.tick(players);
    this.matrixEnergy.tick(players.map(p => p.id));
    this.worldSystem.tick();

    if (this.tickCount % 100 === 0) {
      const brainState = this.worldBrain.analyze({
        economy: { activeMarkets: 1 },
        politics: {},
        world: { resourceCount: 100, npcCount: this.npcSystem.getAllNPCs().length },
        npcMemory: []
      });
      this.ws.broadcast({ type: "dudenregister_update", history: this.dudenregister.getHistory() });
      this.ws.broadcast({ type: "world_brain_update", state: brainState });
      this.ws.broadcast({ type: "oracle_vision", vision: this.oracle.generateVision(brainState) });
      this.saveAll();
    }

    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      players: players.map(p => ({ ...p, matrixEnergy: this.matrixEnergy.getBalance(p.id) })),
      npcs: this.npcSystem.getAllNPCs().map(n => ({ ...n, glbPath: this.glbRegistry.getModelForTarget("npc_single", n.id) })),
      worldState: this.worldSystem.getState(),
      loot: Array.from(this.lootEntities.values())
    });
  }
}
