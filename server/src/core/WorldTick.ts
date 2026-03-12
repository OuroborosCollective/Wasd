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
import { HeuristicWorldBrain } from "../modules/brain/HeuristicWorldBrain.js";
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
  public questSystem: QuestEngine;
  public worldSystem: WorldSystem;
  public worldBrain: HeuristicWorldBrain;
  public persistence: PersistenceManager;
  public glbRegistry: GLBRegistry;
  private lootEntities: Map<string, any> = new Map();

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
    this.worldBrain = new HeuristicWorldBrain();
    this.persistence = new PersistenceManager();
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
      const charName = this.socketToPlayer.get(id);
      if (charName) {
        this.observerEngine.unregister(id);
        this.socketToPlayer.delete(id);
        await this.saveAll();
        console.log(`Player ${charName} (Socket ${id}) disconnected.`);
      }
    };

    this.ws.onPlayerMessage = async (id, msg) => {
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
        const dx = Math.max(-1, Math.min(1, Number(msg.dx) || 0));
        const dy = Math.max(-1, Math.min(1, Number(msg.dy) || 0));
        
        if (!isNaN(dx) && !isNaN(dy)) {
          player.position.x += dx * speed;
          player.position.y += dy * speed;
          this.observerEngine.updatePosition(id, { x: player.position.x, y: player.position.y });
        }
      } else if (msg.type === "admin_glb_scan") {
        if (player.role !== "admin") return;
        const models = this.glbRegistry.scanModels();
        this.ws.sendToPlayer(id, { type: "admin_glb_scan_result", models });
      } else if (msg.type === "admin_glb_list") {
        if (player.role !== "admin") return;
        const links = this.glbRegistry.getLinks();
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links });
      } else if (msg.type === "admin_glb_link") {
        if (player.role !== "admin") return;
        this.glbRegistry.addLink({
          glbPath: msg.glbPath,
          targetType: msg.targetType,
          targetId: msg.targetId
        });
        const links = this.glbRegistry.getLinks();
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links });
      } else if (msg.type === "admin_glb_unlink") {
        if (player.role !== "admin") return;
        this.glbRegistry.removeLink(msg.targetType, msg.targetId);
        const links = this.glbRegistry.getLinks();
        this.ws.sendToPlayer(id, { type: "admin_glb_list_result", links });
      } else if (msg.type === "equip") {
        if (!checkCooldown(500)) return;
        const itemId = msg.itemId;
        const equipment = this.inventorySystem.equipItem(player, itemId);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Equipped item.` });
          await this.saveAll();
        }
      } else if (msg.type === "unequip") {
        if (!checkCooldown(500)) return;
        const slot = msg.slot;
        const equipment = this.inventorySystem.unequipItem(player, slot);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Unequipped ${slot}.` });
          await this.saveAll();
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
            
            this.ws.broadcast({
              type: "combat_feedback",
              targetId,
              damage: totalDamage,
              health: npc.health,
              maxHealth: npc.maxHealth
            });

            if (npc.health <= 0) {
              if (npc.dropTable) {
                for (const drop of npc.dropTable) {
                  if (Math.random() < drop.chance) {
                    const item = ItemRegistry.createInstance(drop.itemId);
                    if (item) {
                      const lootId = `loot_${Date.now()}_${Math.random()}`;
                      this.lootEntities.set(lootId, {
                        id: lootId,
                        item: item,
                        position: { x: npc.position.x, y: npc.position.y }
                      });
                      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You see ${item.name} drop!` });
                    }
                  }
                }
              }

              npc.health = npc.maxHealth || 100; // Respawn
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You destroyed ${npc.name}! It respawns.` });

              // Check for combat quest completion
              const activeQuests = player.quests.filter((q: any) => !q.completed);
              for (const q of activeQuests) {
                if (q.objective === "combat" && q.targetId === targetId) {
                  const reward = this.questSystem.completeQuest(player, q.id);
                  if (reward) {
                    this.broadcastQuestCompletion(id, q, reward);
                  }
                }
              }
            }
          }
        }
      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        const loot = this.lootEntities.get(targetId);
        if (npc) {
          const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
          if (dist < 20) {
            // ... NPC interaction logic ...
            const interaction = this.npcSystem.handleInteraction(
              targetId, 
              player,
              this.questSystem.getQuestDefinitions()
            );
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
                  this.ws.sendToPlayer(id, {
                    type: "dialogue",
                    source: "System",
                    text: `Quest Started: ${quest.name}`
                  });
                  await this.saveAll();
                }
              }

              // Check for quest completion
              const activeQuests = player.quests.filter((q: any) => !q.completed);
              for (const q of activeQuests) {
                let completed = false;
                if (q.objective === "talk_to" && q.targetNpcId === targetId) {
                  completed = true;
                } else if (q.objective === "collect" && q.targetNpcId === targetId) {
                  // Check inventory for required items
                  const count = player.inventory.filter((item: any) => item.id === q.requiredItemId).length;
                  if (count >= (q.requiredCount || 1)) {
                    // Consume items
                    for (let i = 0; i < (q.requiredCount || 1); i++) {
                      const index = player.inventory.findIndex((item: any) => item.id === q.requiredItemId);
                      if (index !== -1) player.inventory.splice(index, 1);
                    }
                    completed = true;
                  } else {
                    this.ws.sendToPlayer(id, {
                      type: "dialogue",
                      source: "System",
                      text: `You need ${q.requiredCount || 1}x ${q.requiredItemId} to complete this quest.`
                    });
                  }
                }

                if (completed) {
                  const reward = this.questSystem.completeQuest(player, q.id);
                  if (reward) {
                    this.broadcastQuestCompletion(id, q, reward);
                  }
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
        } else if (loot) {
          const dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
          if (dist < 20) {
            this.inventorySystem.addItem(player, loot.item);
            this.lootEntities.delete(targetId);
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` });
          } else {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: "System",
              text: "Target is too far away."
            });
          }
        }
      } else if (msg.type === "dialogue_choice") {
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
              this.ws.sendToPlayer(id, {
                type: "dialogue",
                source: "System",
                text: `Quest Started: ${quest.name}`
              });
              this.saveAll();
            }
          }
        }
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

  private broadcastQuestCompletion(socketId: string, quest: any, reward: any) {
    let rewardText = `Quest Completed: ${quest.name}! You earned ${reward.gold} gold and ${reward.xp} XP.`;
    if (reward.itemId) {
      const itemDef = ItemRegistry.getItem(reward.itemId);
      if (itemDef) {
        rewardText += ` Received item: ${itemDef.name}`;
      }
    }
    this.ws.sendToPlayer(socketId, {
      type: "dialogue",
      source: "System",
      text: rewardText
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
    // Load persisted data
    const savedData = await this.persistence.load();
    for (const name in savedData) {
      const player = savedData[name];
      if (!player.id) player.id = name;
      this.hydratePlayer(player);
      this.playerSystem.setPlayer(name, player);
    }

    // Load Spawns
    this.loadSpawns();
  }

  async saveAll() {
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
    if (player.health === undefined) player.health = 100;
    if (player.maxHealth === undefined) player.maxHealth = 100;
    if (player.gold === undefined) player.gold = 0;
    if (player.xp === undefined) player.xp = 0;
    if (!player.role) player.role = player.name === "Admin" ? "admin" : "player";
    
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

    // Update Cache
    if (cache) {
      cache.set('world:stats', JSON.stringify({
        onlinePlayers: this.playerSystem.getAllPlayers().length,
        activeChunks: activeChunks.length,
        tick: this.tickCount,
        timestamp: Date.now()
      }), 'EX', 10);
    }

    // 3. Tick global systems
    const players = this.playerSystem.getAllPlayers();
    this.npcSystem.tick(players);
    this.worldSystem.tick();
    if (this.tickCount % 100 === 0) {
      const brainState = this.worldBrain.analyze({
        economy: { activeMarkets: 1 },
        politics: {},
        world: { resourceCount: 100, npcCount: this.npcSystem.getAllNPCs().length },
        npcMemory: []
      });
      this.ws.broadcast({ type: "world_brain_update", state: brainState });
    }

    // 4. Broadcast state to clients
    // We need to broadcast to each socket only what they can see, but for now global broadcast
    
    const npcsWithGlb = this.npcSystem.getAllNPCs().map(npc => {
      let glbPath = this.glbRegistry.getModelForTarget("npc_single", npc.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("npc_group", npc.role);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("monster_group", npc.role);
      return { ...npc, glbPath };
    });

    const lootWithGlb = Array.from(this.lootEntities.values()).map(loot => {
      let glbPath = this.glbRegistry.getModelForTarget("object_single", loot.id);
      if (!glbPath) glbPath = this.glbRegistry.getModelForTarget("object_group", loot.item.id);
      return { ...loot, glbPath };
    });

    this.ws.broadcast({
      type: "world_tick",
      tick: this.tickCount,
      activeChunkIds: activeChunks.map(c => c.id),
      players: players.map(p => ({ ...p, questStatus: this.questSystem.getQuestStatus(p) })),
      npcs: npcsWithGlb,
      loot: lootWithGlb
    });

    if (this.tickCount % 100 === 0) {
      console.log(`World Tick ${this.tickCount} - Active Chunks: ${activeChunks.length}`);
    }
  }
}
