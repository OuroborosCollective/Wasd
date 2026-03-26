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
        if (!msg.token) {
          this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: No token provided" });
          // Disconnect unauthorized user
          setTimeout(() => {
            const client = Array.from(this.ws['wss'].clients).find(c => c.id === id);
            if (client) client.close();
          }, 500);
          return;
        }

        let charName = "Unknown";
        let uid = "";

        try {
          const decodedToken = await verifyFirebaseToken(msg.token);
          if (decodedToken) {
            uid = decodedToken.uid;
            charName = decodedToken.name || decodedToken.email?.split('@')[0] || `Player_${uid.substring(0,6)}`;
            console.log(`Verified player ${charName} with UID ${uid}`);
          } else {
            // If Firebase is not initialized, we reject in production but might need to fallback in dev.
            // For real auth, we must reject if we can't verify.
            console.error("Firebase not initialized. Cannot verify token.");
            this.ws.sendToPlayer(id, { type: "error", message: "Authentication service unavailable" });
            return;
          }
        } catch (e) {
          console.error("Token verification failed:", e);
          this.ws.sendToPlayer(id, { type: "error", message: "Authentication failed: Invalid token" });
          return;
        }

        let player = this.playerSystem.getPlayer(uid); // Use UID as the persistent player ID

        if (player) {
          if (player.isOffline) {
            player.isOffline = false;
            console.log(`Player ${charName} (UID: ${uid}) re-possessed their character.`);
          } else {
            // Kick old session if already logged in?
            // For now just allow it or handle as duplicate
          }
        } else {
          player = this.playerSystem.createPlayer(uid, charName, msg.class, msg.appearance);
          this.hydratePlayer(player);
        }

        // Ensure their display name is up-to-date with Firebase
        if (player.name !== charName) player.name = charName;

        this.socketToPlayer.set(id, uid); // use UID instead of charName
        this.observerEngine.register(id, { x: player.position.x, y: player.position.y });

        this.ws.sendToPlayer(id, {
          type: "welcome",
          id: uid, // Use UID here for frontend as well
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

      const playerId = this.socketToPlayer.get(id);
      if (!playerId) return;

      const player = this.playerSystem.getPlayer(playerId);
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
      } else if (msg.type === "admin_place_object") {
        if (player.role !== "admin") return;
        const { type, name, glbPath, scale } = msg;
        const newObj = {
          id: `${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          type: type || "object",
          name: name || "New Object",
          position: { x: player.position.x, y: player.position.y },
          rotation: 0,
          scale: scale || 1,
          glbPath: glbPath
        };
        await this.worldSystem.objectSystem.addObject(newObj);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Placed ${newObj.name} at your position.` });
      } else if (msg.type === "admin_glb_upload") {
        if (player.role !== "admin") return;
        const { filename, data } = msg;
        if (filename && data) {
          const buffer = Buffer.from(data, 'base64');
          this.glbRegistry.saveModel(filename, buffer);
          const models = this.glbRegistry.scanModels();
          this.ws.sendToPlayer(id, { type: "admin_glb_scan_result", models });
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
      } else if (msg.type === "admin_generate_world") {
        if (player.role !== "admin") return;
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Generating world: ${msg.prompt}...` });
        import("../modules/ai/WorldGenerationFlow.js").then(({ generateWorldObjectsFlow }) => {
          generateWorldObjectsFlow({ prompt: msg.prompt, baseX: player.position.x, baseY: player.position.y })
            .then((objects) => {
              for (const obj of objects) {
                // Ensure unique ID
                obj.id = `${obj.type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                this.worldSystem.objectSystem.addObject(obj);
              }
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Generated ${objects.length} objects.` });
            })
            .catch((err) => {
              console.error("World generation failed", err);
              this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `World generation failed: ${err.message}` });
            });
        });
      } else if (msg.type === "chat") {
        const text = msg.text;
        if (text && typeof text === "string" && text.trim().length > 0) {
          this.ws.broadcast({
            type: "chat_message",
            source: player.name,
            text: text.trim()
          });
        }
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
    const charName = msg.name || `Guest_${id.substring(0, 4)}`;
    let player = await this.persistence.loadPlayer(charName); // Attempt to load existing player
    if (!player) {
      // If player doesn't exist, create a new one
      player = this.playerSystem.createPlayer(charName, charName);
      this.hydratePlayer(player); // Hydrate new player
    } else {
      // If player exists, ensure it's set in playerSystem (might be from previous session)
      this.playerSystem.setPlayer(charName, player);
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
        position: player.position,
        appearance: player.appearance
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
    // Optimization: Use squared distance to avoid Math.hypot() square root
    if (dx * dx + dy * dy > GameConfig.attackDistance * GameConfig.attackDistance) {
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
    // Roll loot and gold from NPC's drop table
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

    // Update quests related to NPC combat
    const questRewards = this.questSystem.updateCombatQuests(player, npc.id, npcInstanceId);
    for (const reward of questRewards) {
      this.broadcastQuestCompletion(socketId, reward.quest, reward.reward);
    }
    this.updateLootCache();

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
    const playerId = this.socketToPlayer.get(id)!;
    if (!this.checkCooldown(playerId, "interact", 500)) return;

    const targetId = msg.targetId;
    const npc = this.npcSystem.getNPC(targetId);
    const loot = this.lootEntities.get(targetId);
    const resource = this.resourceSystem.nodes.get(targetId);

    if (npc) {
      const dx = player.position.x - npc.position.x;
      const dy = player.position.y - npc.position.y;
      // Optimization: Use squared distance to avoid Math.hypot() square root
      if (dx * dx + dy * dy > GameConfig.interactDistance * GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Target is too far away." });
        return;
      }

      // Check if NPC is a shopkeeper
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
            // ⚡ Bolt Optimization: Use a single backwards loop to count and selectively splice items
            // instead of chaining .filter().length and multiple .findIndex() + .splice() calls
            let count = 0;
            const reqCount = q.requiredCount || 1;
            for (let i = player.inventory.length - 1; i >= 0; i--) {
              if (player.inventory[i].id === q.requiredItemId) {
                count++;
              }
            }
            if (count >= reqCount) {
              let removed = 0;
              for (let i = player.inventory.length - 1; i >= 0 && removed < reqCount; i--) {
                if (player.inventory[i].id === q.requiredItemId) {
                  player.inventory.splice(i, 1);
                  removed++;
                }
              }
              completed = true;
            } else {
              this.ws.sendToPlayer(id, {
                type: "dialogue", source: "System",
                text: `You need ${reqCount}x ${q.requiredItemId} to complete this quest.`
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
      const dx = player.position.x - loot.position.x;
      const dy = player.position.y - loot.position.y;
      // Optimization: Use squared distance to avoid Math.hypot() square root
      if (dx * dx + dy * dy > GameConfig.interactDistance * GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      this.inventorySystem.addItem(player, loot.item);
      this.lootEntities.delete(targetId);
      this.updateLootCache();
      this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Picked up ${loot.item.name}!` });
      this.debouncedSave();
    } else if (resource) {
      const dx = player.position.x - resource.position.x;
      const dy = player.position.y - resource.position.y;
      // ⚡ Bolt Optimization: Use squared distance to avoid Math.hypot() square root
      if (dx * dx + dy * dy > GameConfig.interactDistance * GameConfig.interactDistance) {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: "Too far away." });
        return;
      }
      const gatherResult = this.resourceSystem.gatherNode(targetId);
      if (gatherResult.success && gatherResult.item) {
        this.inventorySystem.addItem(player, gatherResult.item);
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: `Gathered ${gatherResult.item.name}!` });
      } else {
        this.ws.sendToPlayer(id, { type: "dialogue", source: "System", text: gatherResult.reason || "Cannot gather that." });
      }
      this.debouncedSave();
    }
  }

  private handleDialogueChoice(id: string, player: any, msg: any) {
    const { npcId, nodeId, choiceId } = msg;
    const interaction = this.npcSystem.handleChoice(npcId, nodeId, choiceId, player);
    if (interaction) {
      // ⚡ Bolt Optimization: Invalidate quest cache as dialogue choices can change player flags or reputation
      this.questSystem.invalidateCache(player);

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
    const playerId = this.socketToPlayer.get(id)!;
    const chatMsg = this.chatSystem.sendMessage(playerId, player.name, msg.channel || "global", msg.text);
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
    // Test Firestore connection
    const connected = await this.persistence.testConnection();
    if (connected) {
      console.log("✅ Firestore connection verified successfully.");
    } else {
      console.error("❌ Firestore connection failed. Please check your configuration.");
    }

    // Load persisted player data
    const savedData = await this.persistence.load();
    for (const id in savedData) {
      const player = savedData[id];
      if (!player.id) player.id = id;
      this.hydratePlayer(player);
      this.playerSystem.setPlayer(id, player); // ID is now the key
    }

    // Load persisted world objects
    if (this.worldSystem.objectSystem) {
      const savedWorldObjects = await this.persistence.loadWorldObjects();
      if (savedWorldObjects && savedWorldObjects.length > 0) {
        for (const obj of savedWorldObjects) {
          // ensure type compatibility
          this.worldSystem.objectSystem.objectsMap.set(obj.id, obj);
        }
        console.log(`Loaded ${savedWorldObjects.length} world objects from Firestore`);
      }
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

    // Save world objects as well
    if (this.worldSystem.objectSystem) {
      const allObjects = this.worldSystem.objectSystem.getAllObjects();
      if (allObjects.length > 0) {
        await this.persistence.saveWorldObjects(allObjects);
      }
    }
  }

  private hydratePlayer(player: any) {
    if (!player.id) player.id = "unknown";
    if (!player.name) player.name = player.id;
    if (!player.class) player.class = "Novice";
    if (!player.appearance) player.appearance = "default";
    if (!player.flags) player.flags = {};
    if (!player.position) player.position = { x: 0, y: 0, z: 0 };
    if (!player.inventory) player.inventory = [];
    if (!player.quests) player.quests = [];
    if (!player.equipment) player.equipment = { weapon: null, armor: null };
    if (player.health === undefined) player.health = 100;
    if (player.maxHealth === undefined) player.maxHealth = 100;
    if (player.gold === undefined) player.gold = 0;
    if (player.xp === undefined) player.xp = 0;
    if (player.level === undefined) player.level = 1;
    if (player.appearance === undefined) player.appearance = characterAssembly.generateNPCAppearance(player.gender || 'male', player.name); // Default appearance if none exists
    // Ensure appearance object is fully hydrated with default values if partial
    if (player.appearance) {
      player.appearance = characterAssembly.validateAppearance(player.appearance);
      // ⚡ Bolt Optimization: Pre-resolve character appearances to avoid O(N) map lookups and
      // redundant object spreads in the hot broadcast loop (10Hz).
      const paths = characterAssembly.resolveModelPaths(player.appearance);
      player.resolvedAppearance = {
        ...player.appearance,
        characterModelUrl: paths.bodyUrl, // Full model URL
        skinToneColor: paths.skinColor,
        hairColor: paths.hairColor,
        eyeColor: paths.eyeColor
      };
    } else {
      player.resolvedAppearance = null;
    }
    if (!player.role) player.role = "player";

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
    const allPlayers = this.playerSystem.getAllPlayers();
    const onlinePlayers = [];
    const offlinePlayers = [];
    for (const p of allPlayers) {
      if (p.isOffline) {
        offlinePlayers.push(p);
      } else {
        onlinePlayers.push(p);
      }
    }

    this.npcSystem.tick(onlinePlayers, this.worldSystem.worldTime);
    this.worldSystem.tick();

    // 3.1 Process Offline Player Heuristic (Simulate life)
    for (const p of offlinePlayers) {
      if (p.id === "dummy_player") continue;

      const now = Date.now();
      if (p.targetPosition) {
        const dx = p.targetPosition.x - p.position.x;
        const dy = p.targetPosition.y - p.position.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) {
          p.targetPosition = null;
          p.state = "idle";
          p.stateTimer = now + Math.random() * 5000 + 2000;
        } else {
          const speed = 0.3; // Slower than active players
          p.position.x += (dx / dist) * speed;
          p.position.y += (dy / dist) * speed;
        }
      } else if (now > p.stateTimer) {
        // Random wander
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 15;
        p.targetPosition = {
          x: p.position.x + Math.cos(angle) * dist,
          y: p.position.y + Math.sin(angle) * dist
        };
        p.state = "wandering";
      }
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

    const worldObjectsWithGlb = this.worldSystem.objectSystem.getAllObjects().map(obj => {
      let glbPath = obj.glbPath || this.glbRegistry.getModelForTarget("object_group", obj.type);
      return { ...obj, glbPath };
    });

    // Periodic save every minute
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
}
