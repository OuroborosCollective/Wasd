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

  private socketToPlayer: Map<string, string> = new Map(); // socketId -> characterName
  private lastActionTimes: Map<string, number> = new Map(); // charName -> timestamp

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

    // Load persisted data
    const savedData = this.persistence.load();
    for (const name in savedData) {
      const player = savedData[name];
      this.hydratePlayer(player);
      this.playerSystem.setPlayer(name, player);
    }

    // Create NPCs
    this.npcSystem.createNPC("npc_1", "Test NPC", 32, 32);
    this.npcSystem.createNPC("npc_2", "Outpost Guard", 500, 500);
    
    // Combat Hook: Training Dummy
    const dummy = this.npcSystem.createNPC("npc_dummy", "Training Dummy", 64, 64);
    if (dummy) {
      dummy.health = 100;
      dummy.maxHealth = 100;
    }

    // Create a dummy player in a distant chunk to prove multi-observer union
    const dummyPlayer = this.playerSystem.createPlayer("dummy_player", "Dummy Player");
    dummyPlayer.position.x = 500;
    dummyPlayer.position.y = 500;
    this.observerEngine.register("dummy_player", { x: 500, y: 500 });

    this.ws.onPlayerConnect = (id) => {
      console.log(`Socket ${id} connected. Waiting for login...`);
    };

    this.ws.onPlayerDisconnect = (id) => {
      const charName = this.socketToPlayer.get(id);
      if (charName) {
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        this.saveAll();
        console.log(`Player ${charName} (Socket ${id}) disconnected.`);
      }
    };

    this.ws.onPlayerMessage = (id, msg) => {
      if (msg.type === "login") {
        const charName = msg.name || `Guest_${id.substring(0, 4)}`;
        let player = this.playerSystem.getPlayer(charName);
        if (!player) {
          player = this.playerSystem.createPlayer(charName, charName);
          this.hydratePlayer(player);
        }
        
        this.socketToPlayer.set(id, charName);
        this.observerEngine.register(id, { x: player.position.x, y: player.position.y });
        
        this.ws.sendToPlayer(id, {
          type: "welcome",
          id: charName,
          stats: {
            gold: player.gold,
            xp: player.xp,
            inventory: player.inventory,
            equipment: player.equipment,
            quests: player.quests
          }
        });
        
        console.log(`Player ${charName} logged in on socket ${id}`);
        return;
      }

      const charName = this.socketToPlayer.get(id);
      if (!charName) return;

      const player = this.playerSystem.getPlayer(charName);
      if (!player) return;

      const now = Date.now();
      const checkCooldown = (cooldown: number) => {
        const last = this.lastActionTimes.get(charName) || 0;
        if (now - last < cooldown) return false;
        this.lastActionTimes.set(charName, now);
        return true;
      };

      if (msg.type === "move_intent") {
        // Server-authoritative movement calculation
        const speed = 5;
        // Clamp intent to prevent speed hacking
        const dx = Math.max(-1, Math.min(1, msg.dx || 0));
        const dy = Math.max(-1, Math.min(1, msg.dy || 0));
        
        player.position.x += dx * speed;
        player.position.y += dy * speed;
        
        this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
      } else if (msg.type === "equip") {
        if (!checkCooldown(500)) return;
        const itemId = msg.itemId;
        const equipment = this.inventorySystem.equipItem(player, itemId);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Equipped item.` });
          this.saveAll();
        }
      } else if (msg.type === "unequip") {
        if (!checkCooldown(500)) return;
        const slot = msg.slot;
        const equipment = this.inventorySystem.unequipItem(player, slot);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Unequipped ${slot}.` });
          this.saveAll();
        }
      } else if (msg.type === "attack") {
        if (!checkCooldown(800)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        if (npc && npc.health !== undefined) {
          const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
          if (dist < 30) {
            const baseDamage = 10;
            let weaponDamage = 0;
            let weaponName = "fists";

            if (player.equipment?.weapon) {
              const itemDef = ItemRegistry.getItem(player.equipment.weapon.id);
              if (itemDef) {
                weaponDamage = itemDef.damage || 0;
                weaponName = itemDef.name;
              }
            }
            
            const totalDamage = baseDamage + weaponDamage;
            
            npc.health -= totalDamage;
            if (npc.health <= 0) {
              npc.health = 100; // Respawn dummy
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "You destroyed the Training Dummy! It respawns." });
            } else {
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You hit ${npc.name} with ${weaponName} for ${totalDamage} damage! (${npc.health}/${npc.maxHealth})` });
            }
          }
        }
      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        if (npc) {
          const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
          if (dist < 20) {
            const interaction = this.npcSystem.handleInteraction(targetId, charName);
            if (interaction) {
              this.ws.sendToPlayer(id, {
                type: "dialogue",
                source: interaction.source,
                text: interaction.text
              });

              if (interaction.questId) {
                const quest = this.questSystem.startQuest(player, interaction.questId as any);
                if (quest) {
                  this.ws.sendToPlayer(id, {
                    type: "dialogue",
                    source: "System",
                    text: `Quest Started: ${quest.name}`
                  });
                  this.saveAll();
                }
              }

              // Check for quest completion
              if (targetId === "npc_2") {
                const reward = this.questSystem.completeQuest(player, "first_steps");
                if (reward) {
                  let rewardText = `Quest Completed: First Steps! You earned ${reward.gold} gold and ${reward.xp} XP.`;
                  if (reward.itemId) {
                    const itemDef = ItemRegistry.getItem(reward.itemId);
                    if (itemDef) {
                      rewardText += ` Received item: ${itemDef.name}`;
                    }
                  }
                  this.ws.sendToPlayer(id, {
                    type: "dialogue",
                    source: "System",
                    text: rewardText
                  });
                  this.saveAll();
                }
              }
            }
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

  saveAll() {
    const allPlayers = this.playerSystem.getAllPlayers();
    const data: any = {};
    for (const p of allPlayers) {
      if (p.id !== "dummy_player") {
        // Clone player and strip item details for clean persistence
        const persistedPlayer = JSON.parse(JSON.stringify(p));
        this.stripPlayerItems(persistedPlayer);
        data[p.id] = persistedPlayer;
      }
    }
    this.persistence.save(data);
  }

  private hydratePlayer(player: any) {
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
  }

  private stripPlayerItems(player: any) {
    const strip = (item: any) => {
      if (!item || !item.id) return item;
      return { id: item.id }; // Only keep ID for persistence
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

    // Move dummy player back and forth
    const dummyPlayer = this.playerSystem.getPlayer("dummy_player");
    if (dummyPlayer) {
      dummyPlayer.position.x = 500 + Math.sin(this.tickCount * 0.1) * 50;
      // Note: dummy_player is not a socket, so we don't update observer by socket ID here
      // But for simplicity in this demo we'll just leave it
    }
    
    // 1. Update active chunks based on observers
    const observedChunks = this.observerEngine.getObservedChunks();
    const observedChunkIds = new Set(observedChunks.map(c => c.id));
    
    // Deactivate all chunks first
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

    // 3. Tick global systems
    this.npcSystem.tick();
    this.worldSystem.tick();

    // 4. Broadcast state to clients
    // We need to broadcast to each socket only what they can see, but for now global broadcast
    const players = this.playerSystem.getAllPlayers();
    
    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      activeChunkIds: activeChunks.map(c => c.id),
      players: players,
      npcs: this.npcSystem.getAllNPCs()
    });

    if (this.tickCount % 100 === 0) {
      console.log(`World Tick ${this.tickCount} - Active Chunks: ${activeChunks.length}`);
    }
  }
}
