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

    // Create a test NPC
    this.npcSystem.createNPC("npc_1", "Test NPC", 32, 32);

    // Create a dummy player in a distant chunk to prove multi-observer union
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });

    this.ws.onPlayerConnect = (id) => {
      const player = this.playerSystem.createPlayer(id, `Player_${id}`);
      this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
      console.log(`Player ${id} connected.`);
    };

    this.ws.onPlayerDisconnect = (id) => {
      this.playerSystem.removePlayer(id);
      this.observerEngine.unregister(id);
      console.log(`Player ${id} disconnected.`);
    };

    this.ws.onPlayerMessage = (id, msg) => {
      const player = this.playerSystem.getPlayer(id);
      if (!player) return;

      if (msg.type === "move_intent") {
        // Server-authoritative movement calculation
        const speed = 5;
        // Clamp intent to prevent speed hacking
        const dx = Math.max(-1, Math.min(1, msg.dx || 0));
        const dy = Math.max(-1, Math.min(1, msg.dy || 0));
        
        player.position.x += dx * speed;
        player.position.y += dy * speed;
        
        this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
      } else if (msg.type === "interact") {
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        if (npc) {
          const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
          if (dist < 20) {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: npc.name,
              text: "Hello there, traveler! The world is dangerous, stay safe."
            });
          } else {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: "System",
              text: "Target is too far away."
            });
          }
        }
      }
    };
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

    // Move dummy player back and forth
    const dummyPlayer = this.playerSystem.getPlayer("dummy_player");
    if (dummyPlayer) {
      dummyPlayer.position.x = 500 + Math.sin(this.tickCount * 0.1) * 50;
      this.observerEngine.updatePosition("dummy_player", { x: dummyPlayer.position.x, y: dummyPlayer.position.y });
    }
    
    // 1. Update active chunks based on observers
    const observedChunks = this.observerEngine.getObservedChunks();
    const observedChunkIds = new Set(observedChunks.map(c => c.id));
    
    // Deactivate all chunks first (or we could optimize this by only deactivating ones no longer observed)
    // For now, we'll just set the active flag based on the observed set
    const allActive = this.chunkSystem.getActiveChunks();
    for (const chunk of allActive) {
      if (!observedChunkIds.has(chunk.id)) {
        this.chunkSystem.setChunkActive(chunk.id, false);
      }
    }
    
    for (const chunkInfo of observedChunks) {
      this.chunkSystem.getChunk(chunkInfo.chunkX, chunkInfo.chunkY); // Ensure it exists
      this.chunkSystem.setChunkActive(chunkInfo.id, true);
    }

    // 2. Process active chunks
    const activeChunks = this.chunkSystem.getActiveChunks();
    for (const chunk of activeChunks) {
      // Here we would tick NPCs, events, etc. within this chunk
      // e.g., this.npcBrain.tickChunk(chunk);
    }

    // 3. Tick global systems
    this.npcSystem.tick();
    this.worldSystem.tick();

    // 4. Broadcast state to clients
    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      activeChunkIds: activeChunks.map(c => c.id),
      players: this.playerSystem.getAllPlayers ? this.playerSystem.getAllPlayers() : [],
      npcs: this.npcSystem.getAllNPCs()
    });

    if (this.tickCount % 100 === 0) {
      console.log(`World Tick ${this.tickCount} - Active Chunks: ${activeChunks.length}`);
    }
  }
}