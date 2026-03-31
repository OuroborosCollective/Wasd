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
import { verifyFirebaseToken } from "../config/firebase.js";
import { ItemRegistry } from "../modules/inventory/ItemRegistry.js";
import { GLBRegistry } from "../modules/asset-registry/GLBRegistry.js";
import { cache } from "./Cache.js";
import fs from "fs";
import path from "path";

import { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { GameConfig } from "../config/GameConfig.js";

type SpawnPoint = { x: number; y: number; z: number };
type SceneProfile = {
  defaultSpawnKey: string;
  spawnPoints: Record<string, SpawnPoint>;
};

const DEFAULT_SCENE_ID = "didis_hub";
const SCENE_PROFILES: Record<string, SceneProfile> = {
  didis_hub: {
    defaultSpawnKey: "sp_player_default",
    spawnPoints: {
      sp_player_default: { x: 0, y: 0, z: 0 },
      sp_didi_01: { x: 18, y: 0, z: 6 },
      sp_didi_02: { x: -18, y: 0, z: 6 },
    },
  },
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
  private lastActionTimes: Map<string, number> = new Map(); // charName -> timestamp

  private getSceneProfile(sceneId: string | undefined): { sceneId: string; profile: SceneProfile } {
    const resolvedSceneId = sceneId && SCENE_PROFILES[sceneId] ? sceneId : DEFAULT_SCENE_ID;
    return { sceneId: resolvedSceneId, profile: SCENE_PROFILES[resolvedSceneId] };
  }

  private resolveSpawn(sceneId: string | undefined, spawnKey: string | undefined) {
    const { sceneId: resolvedSceneId, profile } = this.getSceneProfile(sceneId);
    const resolvedSpawnKey = spawnKey && profile.spawnPoints[spawnKey] ? spawnKey : profile.defaultSpawnKey;
    const spawnPoint = profile.spawnPoints[resolvedSpawnKey];
    return { sceneId: resolvedSceneId, spawnKey: resolvedSpawnKey, spawnPoint };
  }

  private applySpawnToPlayer(player: any, sceneId: string | undefined, spawnKey: string | undefined) {
    const spawn = this.resolveSpawn(sceneId, spawnKey);
    player.sceneId = spawn.sceneId;
    player.spawnKey = spawn.spawnKey;
    player.position = player.position || { x: 0, y: 0, z: 0 };
    player.position.x = spawn.spawnPoint.x;
    // The gameplay simulation uses x/y plane and maps y -> z for rendering.
    player.position.y = spawn.spawnPoint.z;
    player.position.z = spawn.spawnPoint.y;
    return spawn;
  }

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
        await this.saveAll();
        console.log(`Player ${player.name} (Socket ${id}) disconnected. Character remains in world.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
      if (msg.type === "login") {
        let charName = "Unknown";
        let uid = "";
        
        try {
          if (msg.token) {
            const decodedToken = await verifyFirebaseToken(msg.token);
            if (decodedToken) {
              uid = decodedToken.uid;
              charName = decodedToken.name || decodedToken.email || uid;
            }
          } else {
             // For testing/dev if token not provided, use a random ID
             uid = `dev_${id}`;
             charName = `DevPlayer_${id.substr(0,4)}`;
          }

          let player = this.playerSystem.getPlayer(uid);
          let shouldApplySpawn = false;
          if (!player) {
            player = this.playerSystem.createPlayer(uid, charName);
            console.log(`Created new player: ${charName} (${uid})`);
            shouldApplySpawn = true;
          } else {
            player.isOffline = false;
            console.log(`Player ${charName} reconnected.`);
            shouldApplySpawn = !isNonEmptyString(player.sceneId) || !isNonEmptyString(player.spawnKey);
          }

          const requestedSceneId = isNonEmptyString(msg.sceneId) ? msg.sceneId.trim() : undefined;
          const requestedSpawnKey = isNonEmptyString(msg.spawnKey) ? msg.spawnKey.trim() : undefined;
          if (requestedSceneId || requestedSpawnKey) {
            shouldApplySpawn = true;
          }
          const spawn = shouldApplySpawn
            ? this.applySpawnToPlayer(player, requestedSceneId ?? player.sceneId, requestedSpawnKey ?? player.spawnKey)
            : this.resolveSpawn(player.sceneId, player.spawnKey);

          this.socketToPlayer.set(id, uid);
          this.observerEngine.register(id, player.position);

          this.ws.sendToPlayer(id, {
            type: "welcome",
            playerId: uid,
            id: uid, // legacy support
            sceneId: spawn.sceneId,
            spawnKey: spawn.spawnKey,
            spawnPosition: spawn.spawnPoint,
            stats: {
              gold: player.gold,
              xp: player.xp,
              quests: player.quests,
              inventory: player.inventory,
              equipment: player.equipment
            }
          });
        } catch (err) {
          console.error("Login error:", err);
          this.ws.sendToPlayer(id, { type: "error", message: "Login failed" });
        }
        return;
      }

      if (msg.type === "scene_change") {
        const playerUid = this.socketToPlayer.get(id);
        const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;
        if (!player) {
          return;
        }

        const requestedSceneId = isNonEmptyString(msg.sceneId) ? msg.sceneId.trim() : undefined;
        const requestedSpawnKey = isNonEmptyString(msg.spawnKey) ? msg.spawnKey.trim() : undefined;
        const spawn = this.applySpawnToPlayer(player, requestedSceneId ?? player.sceneId, requestedSpawnKey ?? player.spawnKey);
        this.observerEngine.updatePosition(id, player.position);

        this.ws.sendToPlayer(id, {
          type: "scene_changed",
          sceneId: spawn.sceneId,
          spawnKey: spawn.spawnKey,
          spawnPosition: spawn.spawnPoint,
        });
        return;
      }

      const playerUid = this.socketToPlayer.get(id);
      const player = playerUid ? this.playerSystem.getPlayer(playerUid) : null;

      if (!player) return;

      if (msg.type === "input" || msg.type === "move_intent") {
        const dx = msg.input?.key === 'a' ? -1 : msg.input?.key === 'd' ? 1 : msg.dx || 0;
        const dy = msg.input?.key === 'w' ? -1 : msg.input?.key === 's' ? 1 : msg.dy || 0;

        if (dx !== 0 || dy !== 0) {
          const speed = 0.5;
          player.position.x += dx * speed;
          player.position.y += dy * speed;
          this.observerEngine.updatePosition(id, player.position);
        }
      }

      if (msg.type === "attack") {
        // PlayCanvas attack animation trigger
        this.ws.broadcast({ type: 'entity_action', entityId: player.id, action: 'attack' });
        // Combat logic here...
      }

      if (msg.type === "interact") {
        // Interaction logic...
        this.ws.sendToPlayer(id, { type: 'dialogue', text: "Hello traveler!" });
      }
    };
  }

  async init() {
    const connected = await this.persistence.testConnection();
    if (connected) {
      console.log("✅ Firestore connection verified.");
    }
    const savedData = await this.persistence.load();
    for (const id in savedData) {
      this.playerSystem.setPlayer(id, savedData[id]);
    }
    this.loadSpawns();
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
    } catch (e) {}
  }

  async saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id !== "dummy_player") data[p.id] = p;
    }
    await this.persistence.save(data);
  }

  start() {
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  tick() {
    this.tickCount += 1;
    const onlinePlayers = this.playerSystem.getAllPlayers().filter(p => !p.isOffline);
    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    this.worldSystem.tick();

    if (this.tickCount % 600 === 0) this.saveAll();

    this.broadcastState();
  }

  broadcastState() {
    const entities = [
      ...this.playerSystem.getAllPlayers().map(p => ({
        id: p.id,
        type: 'player',
        position: { x: p.position.x, y: 0, z: p.position.y }, // Mapping y to z for 3D
        rotation: { x: 0, y: 0, z: 0 },
        name: p.name,
        visible: true
      })),
      ...this.npcSystem.getAllNPCs().map(n => ({
        id: n.id,
        type: 'npc',
        position: { x: n.position.x, y: 0, z: n.position.y },
        rotation: { x: 0, y: 0, z: 0 },
        name: n.name,
        visible: true
      })),
      ...Array.from(this.lootEntities.values()).map(l => ({
        id: l.id,
        type: 'loot',
        position: { x: l.position.x, y: 0, z: l.position.y },
        rotation: { x: 0, y: 0, z: 0 },
        visible: true
      }))
    ];

    // Include world objects if they exist
    if (this.worldSystem.objectSystem) {
      const worldObjects = this.worldSystem.objectSystem.getAllObjects().map(obj => ({
        id: obj.id,
        type: obj.type || 'object',
        position: { x: obj.position.x, y: 0, z: obj.position.y },
        rotation: { x: 0, y: obj.rotation || 0, z: 0 },
        visible: true
      }));
      entities.push(...worldObjects);
    }

    const chunks = []; // Simplified for now

    this.ws.broadcast({
      type: 'entity_sync',
      entities,
      chunks: [{ id: 'main', chunkX: 0, chunkY: 0, objects: [] }]
    });
  }

  public getWorld() {
    return {
       updateMonsters: () => {} // Shim for WebSocketServer compatibility if needed
    };
  }
}
