import { updateWorldState } from "../engine/renderer";
import { showDialogue } from "../ui/hud";

export let myPlayerId: string | null = null;
let latestState: any = null;

export function connectSocket() {
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${wsProtocol}//${location.host}/ws`);

  ws.onopen = () => console.log("Connected to Arelorian server");
  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === "welcome") {
        myPlayerId = data.id;
        console.log("My Player ID:", myPlayerId);
      } else if (data.type === "world_tick") {
        latestState = data;
        updateWorldState(data, myPlayerId);
      } else if (data.type === "dialogue") {
        showDialogue(data.source, data.text);
      }
    } catch (e) {
      console.error("Failed to parse message", e);
    }
  };

  // Basic movement controls for testing
  window.addEventListener("keydown", (e) => {
    if (!myPlayerId) return;
    
    if (e.key === "e" || e.key === "E") {
      // Find closest NPC
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
          
          if (closestNpc && minDistance < 30) {
            ws.send(JSON.stringify({
              type: "interact",
              targetId: closestNpc.id
            }));
          } else {
            showDialogue("System", "No one is nearby to interact with.");
          }
        }
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