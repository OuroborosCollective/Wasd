import { MMORPGClientCore } from "../core/MMORPGClientCore";

let globalWs: WebSocket | null = null;

export function connectSocket(core: MMORPGClientCore) {
  const ws = new WebSocket(`ws://${location.hostname}:3000/ws`);
  globalWs = ws;

  ws.onopen = () => {
    console.log("Connected to Arelorian Server");

    core.events.on('input', (input: any) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', input }));
      }
    });

    core.events.on('attack', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'attack' }));
      }
    });

    core.events.on('interact', () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'interact' }));
      }
    });
  };

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'entity_sync') {
        if (data.entities) core.syncEntities(data.entities);
        if (data.chunks) core.syncChunks(data.chunks);
      }
      if (data.type === 'entity_action') {
        core.handleEntityAction(data.entityId, data.action);
      }
      if (data.type === 'welcome') {
        console.log(`Welcome to Areloria! Your ID: ${data.playerId}`);
        core.setLocalPlayer(data.playerId);
      }
      if (data.type === 'dialogue') {
        core.handleDialogue(data.text);
      }
    } catch (e) {
      console.warn("Failed to parse server message:", msg.data);
    }
  };
}

export function sendDialogueChoice(npcId: string, choiceId: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: 'dialogue_choice', npcId, choiceId }));
  }
}

export function sendChatMessage(text: string) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type: 'chat_message', text }));
  }
}

export function sendCommand(type: string, payload: any = {}) {
  if (globalWs && globalWs.readyState === WebSocket.OPEN) {
    globalWs.send(JSON.stringify({ type, ...payload }));
  }
}

export const sendMessage = sendCommand;
