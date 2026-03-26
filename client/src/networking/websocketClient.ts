import { updateWorldState, showFloatingTextAt, setJoystickMoveCallback } from "../engine/renderer";
import { showDialogue, updateHUD, updateCooldowns, renderInventoryPanel } from "../ui/hud";
import { getClosestInteractable, getClosestNpc } from "../utils/interaction";
import { updateAdminAssetModels, updateAdminAssetLinks } from "../ui/adminAssetPanel";

export let myPlayerId: string | null = null;
let latestState: any = null;

const cooldowns = {
  attack: 0,
  interact: 0,
  equip: 0
};

const CD_DURATIONS = {
  attack: 800,
  interact: 500,
  equip: 500
};

export function sendCommand(msg: any) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify(msg));
  }
}

export function sendDialogueChoice(npcId: string, nodeId: string, choiceId: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({
      type: "dialogue_choice",
      npcId,
      nodeId,
      choiceId
    }));
  }
}

export function sendChatMessage(text: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    if (text.startsWith('/build ')) {
      const prompt = text.substring(7);
      globalWs.send(JSON.stringify({
        type: "admin_generate_world",
        prompt
      }));
    } else {
      globalWs.send(JSON.stringify({
        type: "chat",
        text
      }));
    }
  }
}

let globalWs: WebSocket | null = null;

export function connectSocket(token?: string) {
  const externalWsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const localWsUrl = `${wsProtocol}//${location.host}/ws`;
  
  const wsUrl = externalWsUrl || localWsUrl;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  const ws = new WebSocket(wsUrl);
  globalWs = ws;

  // Wire joystick movement to WebSocket (mobile controls)
  setJoystickMoveCallback((dx: number, dy: number) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "move_intent",
        dx,
        dy
      }));
    }
  });

  // Setup mobile action buttons after WebSocket opens
  const setupMobileActionButtons = () => {
    const attackBtn = document.getElementById('mob-attack');
    const interactBtn = document.getElementById('mob-interact');
    const equipBtn = document.getElementById('mob-equip');
    const questsBtn = document.getElementById('mob-quests');
    const mapBtn = document.getElementById('mob-map');
    const chatBtn = document.getElementById('mobile-chat-btn');

    if (attackBtn) {
      attackBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (Date.now() < cooldowns.attack) return;
        if (latestState && latestState.npcs && latestState.players) {
          const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
          if (myPlayer) {
            const { closestNpc, minDistance } = getClosestNpc(myPlayer, latestState.npcs);
            if (closestNpc && minDistance < 40) {
              cooldowns.attack = Date.now() + CD_DURATIONS.attack;
              ws.send(JSON.stringify({ type: "attack", targetId: closestNpc.id }));
            }
          }
        }
      });
    }

    if (interactBtn) {
      interactBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (Date.now() < cooldowns.interact) return;
        if (latestState && (latestState.npcs || latestState.loot) && latestState.players) {
          const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
          if (myPlayer) {
            const closestInteractable = getClosestInteractable(myPlayer, latestState);
            if (closestInteractable) {
              cooldowns.interact = Date.now() + CD_DURATIONS.interact;
              ws.send(JSON.stringify({ type: "interact", targetId: closestInteractable.id }));
            } else {
              showDialogue("System", "No one is nearby to interact with.");
            }
          }
        }
      });
    }

    if (equipBtn) {
      equipBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (Date.now() < cooldowns.equip) return;
        if (latestState && latestState.players) {
          const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
          if (myPlayer && myPlayer.inventory && myPlayer.inventory.length > 0) {
            cooldowns.equip = Date.now() + CD_DURATIONS.equip;
            ws.send(JSON.stringify({ type: "equip", itemId: myPlayer.inventory[0].id }));
          }
        }
      });
    }

    if (questsBtn) {
      questsBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const questsPanel = document.getElementById('quests-panel');
        if (questsPanel) {
          questsPanel.style.display = questsPanel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    if (mapBtn) {
      mapBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const mapPanel = document.getElementById('map-panel');
        if (mapPanel) {
          mapPanel.style.display = mapPanel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    if (chatBtn) {
      chatBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const chatPanel = document.getElementById('chat-panel');
        if (chatPanel) {
          chatPanel.style.display = chatPanel.style.display === 'none' ? 'block' : 'none';
        }
      });
    }
  };

  // Update cooldowns UI every frame
  const cdInterval = setInterval(() => {
    updateCooldowns(cooldowns);
  }, 100);

  ws.onopen = () => {
    console.log("Connected to Arelorian server");
    
    // Send login message with token
    ws.send(JSON.stringify({ type: "login", token }));
  };
  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === "welcome") {
        myPlayerId = data.id;
        console.log("Logged in as:", myPlayerId);
        // Setup mobile action buttons after login
        setupMobileActionButtons();
        if (data.stats) {
          updateHUD({
            gold: data.stats.gold || 0,
            xp: data.stats.xp || 0,
            quests: data.stats.quests || [],
            inventory: data.stats.inventory || [],
            equipment: data.stats.equipment
          });
        }
      } else if (data.type === "world_tick") {
        latestState = data;
        updateWorldState(data, myPlayerId);

        // Update HUD with my player's stats
        if (myPlayerId) {
          const myPlayer = data.players.find((p: any) => p.id === myPlayerId);
          if (myPlayer) {
            updateHUD({
              role: myPlayer.role,
              gold: myPlayer.gold || 0,
              xp: myPlayer.xp || 0,
              quests: myPlayer.quests || [],
              inventory: myPlayer.inventory || [],
              equipment: myPlayer.equipment,
              reputation: myPlayer.reputation,
              questStatus: myPlayer.questStatus,
              worldTime: data.worldTime
            });
          }
        }
      } else if (data.type === "dialogue") {
        showDialogue(data.source, data.text, data.choices, data.npcId);
      } else if (data.type === "combat_feedback") {
        // Find NPC position
        const npc = latestState.npcs.find((n: any) => n.id === data.targetId);
        if (npc) {
          showFloatingTextAt(`-${data.damage}`, npc.position.x, npc.position.y);
        }
      } else if (data.type === "admin_glb_scan_result") {
        updateAdminAssetModels(data.models);
      } else if (data.type === "admin_glb_list_result") {
        updateAdminAssetLinks(data.links);
      } else if (data.type === "chat_message") {
        import("../ui/hud").then(({ addChatMessage }) => {
          addChatMessage(data.source, data.text);
        });
      }
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  };

  // Basic movement controls for testing
  window.addEventListener("keydown", (e) => {
    if (!myPlayerId) return;

    if (e.key === "g" || e.key === "G") {
      if (Date.now() < cooldowns.equip) return;
      // Equip first item in inventory
      if (latestState && latestState.players) {
        const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
        if (myPlayer && myPlayer.inventory && myPlayer.inventory.length > 0) {
          cooldowns.equip = Date.now() + CD_DURATIONS.equip;
          ws.send(JSON.stringify({
            type: "equip",
            itemId: myPlayer.inventory[0].id
          }));
        }
      }
      return;
    }

    if (e.key === "h" || e.key === "H") {
      if (Date.now() < cooldowns.equip) return;
      // Unequip weapon
      cooldowns.equip = Date.now() + CD_DURATIONS.equip;
      ws.send(JSON.stringify({
        type: "unequip",
        slot: "weapon"
      }));
      return;
    }
    
    if (e.key === "f" || e.key === "F") {
      if (Date.now() < cooldowns.attack) return;
      // Attack closest NPC
      if (latestState && latestState.npcs && latestState.players) {
        const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
        if (myPlayer) {
          const { closestNpc, minDistance } = getClosestNpc(myPlayer, latestState.npcs);
          
          if (closestNpc && minDistance < 40) {
            cooldowns.attack = Date.now() + CD_DURATIONS.attack;
            ws.send(JSON.stringify({
              type: "attack",
              targetId: closestNpc.id
            }));
          }
        }
      }
      return;
    }

    if (e.key === "e" || e.key === "E") {
      if (Date.now() < cooldowns.interact) return;
      // Find closest NPC or Loot
      if (latestState && (latestState.npcs || latestState.loot) && latestState.players) {
        const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
        if (myPlayer) {
          const closestInteractable = getClosestInteractable(myPlayer, latestState);
          
          if (closestInteractable) {
            cooldowns.interact = Date.now() + CD_DURATIONS.interact;
            ws.send(JSON.stringify({
              type: "interact",
              targetId: closestInteractable.id
            }));
          } else {
            showDialogue("System", "No one is nearby to interact with.");
          }
        }
      }
      return;
    }

    if (e.key === "i" || e.key === "I") {
      const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
      if (myPlayer) {
        renderInventoryPanel(myPlayer, ws);
      }
      return;
    }

    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowUp" || e.key === "w") dy -= 1;
    if (e.key === "ArrowDown" || e.key === "s") dy += 1;
    if (e.key === "ArrowLeft" || e.key === "a") dx -= 1;
    if (e.key === "ArrowRight" || e.key === "d") dx += 1;
    
    if (dx !== 0 || dy !== 0) {
      // Client no longer calculates or sends absolute positions.
      // We only send movement intent (direction).
      ws.send(JSON.stringify({
        type: "move_intent",
        dx,
        dy
      }));
    }
  });

  return ws;
}