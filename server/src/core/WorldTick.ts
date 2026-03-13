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
import { LootDropSystem } from "../modules/loot/LootDropSystem.js";
import { MonsterSpawner } from "../modules/monster/MonsterSpawner.js";
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
  public lootDropSystem: LootDropSystem;
  public monsterSpawner: MonsterSpawner;

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
    this.lootDropSystem = new LootDropSystem();
    this.monsterSpawner = new MonsterSpawner();
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
          // Sende aktualisiertes Equipment an den Client
          this.ws.sendToPlayer(id, { type: "player_update", equipment: player.equipment });
          await this.saveAll();
        }
      } else if (msg.type === "unequip") {
        if (!checkCooldown(500)) return;
        const slot = msg.slot;
        const equipment = this.inventorySystem.unequipItem(player, slot);
        if (equipment) {
          this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Unequipped ${slot}.` });
          // Sende aktualisiertes Equipment an den Client
          this.ws.sendToPlayer(id, { type: "player_update", equipment: player.equipment });
          await this.saveAll();
        }
      } else if (msg.type === "attack") {
        if (!checkCooldown(800)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        if (npc && npc.health !== undefined) {
          const dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
          if (dist < 30) {
            // Verwende das neue CombatSystem
            const combatResult = this.combatSystem.attack(player, npc);

            if (combatResult.success) {
              this.ws.broadcast({
                type: "combat_feedback",
                targetId,
                damage: combatResult.damage,
                health: combatResult.defenderHealth,
                maxHealth: npc.maxHealth // Annahme: npc.maxHealth ist vorhanden
              });

              // Wenn der NPC besiegt wurde
              if (combatResult.defenderHealth <= 0) {
                // XP-Nachricht an den Spieler senden (falls das SkillSystem dies nicht schon tut)
                this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You defeated ${npc.name}!` });

                // Loot droppen
                if (combatResult.lootDropped && combatResult.lootDropped.length > 0) {
                  // Annahme: npc.position hat x, y, z
                  this.lootDropSystem.dropLoot(combatResult.lootDropped, { x: npc.position.x, y: npc.position.y, z: npc.position.z || 0 }, player.id);
                  this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You see some loot drop!` });
                }

                // NPC respawnen (oder entfernen)
                npc.health = npc.maxHealth || 100; // Respawn
                this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `${npc.name} respawns.` });

                // Quest-Abschluss prüfen
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
        }
      } else if (msg.type === "interact") {
        if (!checkCooldown(500)) return;
        const targetId = msg.targetId;
        const npc = this.npcSystem.getNPC(targetId);
        const loot = this.lootDropSystem.getDroppedLoot(targetId);
        if (loot) {
          const collectedItem = this.lootDropSystem.collectLoot(targetId, player.id);
          if (collectedItem) {
            this.inventorySystem.addItem(player, collectedItem);
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You picked up ${collectedItem.baseItem.name}.` });
            // Sende Update an Clients, dass Loot verschwunden ist
            this.ws.broadcast({ type: "loot_collected", lootId: targetId });
          } else {
            this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `You can't pick that up yet.` });
          }
        } else if (npc) {
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
                npcId: targetId
              });
            }
          }
        }
      } else if (msg.type === "dialogue_choice") {
        if (!checkCooldown(500)) return;
        const { npcId, choiceId } = msg;
        const npc = this.npcSystem.getNPC(npcId);
        if (npc) {
          const interaction = this.npcSystem.handleChoice(npcId, choiceId, player, this.questSystem);
          if (interaction) {
            this.ws.sendToPlayer(id, {
              type: "dialogue",
              source: interaction.source,
              text: interaction.text,
              choices: interaction.choices,
              npcId
            });
          }
        }
      }
    };
  }

  start() {
    this.timer = setInterval(() => this.tick(), 1000 / 60); // 60 FPS
    console.log("World tick started.");
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("World tick stopped.");
    }
  }

  private async tick() {
    this.tickCount++;

    try {
      // Update dynamic world elements (e.g., weather, time of day)
      this.worldSystem.update();

      // Sammle aktive Chunks für die Brain-Analyse
      const activeChunks = this.chunkSystem.getActiveChunks().map(chunk => ({
        id: chunk.id,
        x: chunk.x,
        y: chunk.y,
        monsterCount: this.npcSystem.getNPCsInChunk(chunk.id).length, // Beispiel
        resourceCount: 50, // Beispiel
        playerCount: this.playerSystem.getPlayersInChunk(chunk.id).length, // Beispiel
        conflictLevel: 0.2, // Beispiel
        economicActivity: 0.5, // Beispiel
      }));

      // Update world brain
      const brainContext = {
        economy: this.economySystem.getEconomyState(),
        politics: {}, // TODO: Implement politics
        world: { resourceCount: 1000, npcCount: this.npcSystem.getAllNPCs().length }, // Beispielwerte
        npcMemory: this.npcSystem.getAllNPCs().map(npc => npc.memory), // Beispiel
        activeChunks: activeChunks,
      };
      const brainAnalysis = this.worldBrain.analyze(brainContext);

      // Nutze die Brain-Analyse für Monster-Spawning
      for (const chunkId in brainAnalysis.fieldAnalysis) {
        const fieldAnalysisResult = brainAnalysis.fieldAnalysis[chunkId];
        const spawnedMonsters = this.monsterSpawner.spawnMonstersBasedOnField(chunkId, fieldAnalysisResult);
        // Füge gespawnte Monster zum NPCSystem hinzu
        spawnedMonsters.forEach(monster => this.npcSystem.addNPC(monster));
      }

      // Update NPCs
      this.npcSystem.update(this.playerSystem.getAllPlayers());

      // Update loot entities (cleanup expired)
      this.lootDropSystem.cleanupExpiredLoot();
      // TODO: Clients über Änderungen an Loot-Items informieren

      // Sende den aktuellen Weltzustand an alle verbundenen Clients
      const allPlayers = this.playerSystem.getAllPlayers();
      const allNPCs = this.npcSystem.getAllNPCs();
      const allLoot = this.lootDropSystem.getAllDroppedLoot();

      for (const player of allPlayers) {
        const observerId = this.socketToPlayer.get(player.id); // Annahme: player.id ist socketId oder kann zugeordnet werden
        if (observerId) {
          const observedState = this.observerEngine.getObservedState(observerId, allPlayers, allNPCs, allLoot);
          this.ws.sendToPlayer(observerId, { type: "world_state", ...observedState });
        }
      }

      if (this.tickCount % 3600 === 0) { // Every minute
        await this.saveAll();
      }
    } catch (e) {
      console.error("World tick failed:", e);
    }
  }

  private async saveAll() {
    console.log("Saving all world state...");
    try {
      const players = this.playerSystem.getAllPlayers();
      for (const p of players) {
        await this.persistence.savePlayer(p);
      }
      await this.persistence.saveNPCs(this.npcSystem.getAllNPCs());
      await this.persistence.saveGuilds(this.guildSystem.getAllGuilds());
      await this.persistence.saveEconomy(this.economySystem.getEconomyState());
      await this.glbRegistry.saveLinks();
      console.log("Save complete.");
    } catch (e) {
      console.error("Failed to save world state:", e);
    }
  }

  private async hydratePlayer(player: any) {
    const data = await this.persistence.loadPlayer(player.id);
    if (data) {
      player.gold = data.gold || 0;
      player.xp = data.xp || 0;
      player.inventory = data.inventory || [];
      player.equipment = data.equipment || {};
      player.quests = data.quests || [];
      player.position = data.position || { x: 0, y: 0 };
    }
  }

  private broadcastQuestCompletion(playerId: string, quest: any, reward: any) {
    this.ws.sendToPlayer(playerId, {
      type: "quest_complete",
      questId: quest.id,
      questName: quest.name,
      reward
    });
    this.ws.sendToPlayer(playerId, {
      type: "dialogue",
      source: "System",
      text: `Quest complete: ${quest.name}! You earned ${reward.gold} gold and ${reward.xp} XP.`
    });
  }
}
