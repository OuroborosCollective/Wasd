import { updateWorldState, showFloatingText } from "../engine/renderer.ts";
import { showDialogue, updateHUD, updateCooldowns, renderInventoryPanel } from "../ui/hud.ts";
import { getClosestInteractable } from "../utils/interaction.ts";

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

export function connectSocket() {
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${wsProtocol}//${location.host}/ws`);
  globalWs = ws;

  // Update cooldowns UI every frame
  const cdInterval = setInterval(() => {
    updateCooldowns(cooldowns);
  }, 100);

  ws.onopen = () => {
    console.log("Connected to Arelorian server");
    const name = prompt("Enter your Character Name:", "Hero") || "Hero";
    ws.send(JSON.stringify({ type: "login", name }));
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
        const npc = latestState.npcs.find((n: any) => n.id === data.targetId);
        if (npc) {
          showFloatingText(`-${data.damage}`, npc.position.x, npc.position.y);
        }
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