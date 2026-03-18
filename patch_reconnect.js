const fs = require('fs');
let file = 'client/src/networking/websocketClient.ts';
let content = fs.readFileSync(file, 'utf8');

// The onclose handler currently says:
// if (!event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) { attemptReconnect(); }
// However, it should arguably always attempt reconnect unless explicitly disconnected by user (isReconnecting flag can help, but here we can just ensure we attempt)
const targetBlock = `  ws.onclose = (event) => {
    console.log("WebSocket closed", event.code, event.reason);
    // Attempt to reconnect unless intentional close
    if (!event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      attemptReconnect();
    }
  };`;

const newBlock = `  ws.onclose = (event) => {
    console.log("WebSocket closed", event.code, event.reason);
    // Attempt to reconnect unless it's a normal closure (1000) or we've hit max attempts
    if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      attemptReconnect();
    } else if (event.code !== 1000) {
      console.error("WebSocket disconnected and max reconnect attempts reached.");
      const notif = document.createElement("div");
      notif.style.cssText = \`position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(255,0,0,0.85);color:white;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;z-index:9999;text-align:center;\`;
      notif.innerHTML = \`Connection Lost. Please refresh the page.\`;
      document.body.appendChild(notif);
    }
  };`;

content = content.replace(targetBlock, newBlock);

fs.writeFileSync(file, content);
