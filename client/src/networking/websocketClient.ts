import { updateWorldState, showFloatingTextAt } from "../engine/renderer";
import { showDialogue, updateHUD, updateCooldowns, renderInventoryPanel } from "../ui/hud";
import { getClosestInteractable } from "../utils/interaction";
import { updateAdminAssetModels, updateAdminAssetLinks } from "../ui/adminAssetPanel";
import { handleGMMessage } from "../ui/gmPanel";

export let myPlayerId: string | null = null;
let latestState: any = null;

// Public API for mobile controls
export function sendMessage(msg: any) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify(msg));
  }
}

export function triggerAttack() {
  if (!myPlayerId || !latestState) return;
  if (Date.now() < cooldowns.attack) return;
  if (latestState.npcs && latestState.players) {
    const myPlayer = latestState.players.find((p: any) => p.id === myPlayerId);
    if (myPlayer) {
      let closestNpc = null;
      let minDistance = Infinity;
      for (const npc of latestState.npcs) {
        const dist = Math.hypot(myPlayer.position.x - npc.position.x, myPlayer.position.y - npc.position.y);
        if (dist < minDistance) { minDistance = dist; closestNpc = npc; }
      }
      if (closestNpc && minDistance < 40) {
        cooldowns.attack = Date.now() + CD_DURATIONS.attack;
        globalWs?.send(JSON.stringify({ type: "attack", targetId: closestNpc.id }));
      }
    }
  }
}

export function triggerInteract() {
  if (!myPlayerId || !latestState) return;
  if (Date.now() < cooldowns.interact) return;
  const myPlayer = latestState.players?.find((p: any) => p.id === myPlayerId);
  if (myPlayer) {
    const closestInteractable = getClosestInteractable(
      { x: myPlayer.position.x, y: myPlayer.position.y },
      latestState.npcs || [],
      latestState.loot || []
    );
    if (closestInteractable) {
      cooldowns.interact = Date.now() + CD_DURATIONS.interact;
      globalWs?.send(JSON.stringify({ type: "interact", targetId: closestInteractable.id }));
    }
  }
}

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

let globalWs: WebSocket | null = null;

export function connectSocket(displayName?: string) {
  const externalWsUrl = (import.meta.env as any).VITE_WS_URL;
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const localWsUrl = `${wsProtocol}//${location.host}/ws`;
  
  const wsUrl = externalWsUrl || localWsUrl;
  
  const ws = new WebSocket(wsUrl);
  globalWs = ws;

  // Update cooldowns UI every frame
  const cdInterval = setInterval(() => {
    updateCooldowns(cooldowns);
  }, 100);

  ws.onopen = () => {
    console.log("Connected to Arelorian server");
    // Auto-login with Firebase display name
    const name = displayName || "Adventurer";
    ws.send(JSON.stringify({ type: "login", name }));
    console.log(`Auto-logged in as: ${name}`);
  };
  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === "welcome") {
        myPlayerId = data.id;
        console.log("Logged in as:", myPlayerId);
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
              questStatus: myPlayer.questStatus
            });
          }
        }
      } else if (data.type === "dialogue") {
        showDialogue(data.source, data.text, data.choices, data.npcId);
      } else if (data.type === "combat_feedback") {
        // Find NPC position
        const npc = latestState?.npcs?.find((n: any) => n.id === data.targetId);
        if (npc) {
          showFloatingTextAt(`-${data.damage}`, npc.position.x, npc.position.y, "#ff4444");
        }
        const healTarget = latestState?.players?.find((p: any) => p.id === data.targetId);
        if (healTarget && data.heal) {
          showFloatingTextAt(`+${data.heal}`, healTarget.position.x, healTarget.position.y, "#00ff88");
        }
      } else if (data.type === "admin_glb_scan_result") {
        updateAdminAssetModels(data.models);
        handleGMMessage(data);
      } else if (data.type === "admin_glb_list_result") {
        updateAdminAssetLinks(data.links);
        handleGMMessage(data);
      } else if (data.type === "gm_player_list") {
        handleGMMessage(data);
      } else if (data.type === "kick") {
        alert(`You have been kicked: ${data.reason || "No reason given"}`);
        window.location.reload();
      } else if (data.type === "teleport") {
        // Update local player position
        if (latestState && latestState.players) {
          const me = latestState.players.find((p: any) => p.id === myPlayerId);
          if (me) { me.position.x = data.x; me.position.y = data.y; }
        }
      } else if (data.type === "world_event") {
        // Show world event notification
        const notif = document.createElement("div");
        notif.style.cssText = `position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);border:1px solid rgba(255,215,0,0.5);color:#ffd700;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;z-index:5000;text-align:center;max-width:400px;`;
        notif.innerHTML = `🌍 <strong>${data.title || data.event}</strong>${data.description ? `<br><span style="font-size:12px;color:#c8d8f0">${data.description}</span>` : ""}`;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 6000);
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
          let closestNpc = null;
          let minDistance = Infinity;
          
          for (const npc of latestState.npcs) {
            const dist = Math.hypot(myPlayer.position.x - npc.position.x, myPlayer.position.y - npc.position.y);
            if (dist < minDistance) {
              minDistance = dist;
              closestNpc = npc;
            }
          }
          
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
          const closestInteractable = getClosestInteractable(
            { x: myPlayer.position.x, y: myPlayer.position.y },
            latestState.npcs || [],
            latestState.loot || []
          );
          
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