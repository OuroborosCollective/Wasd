import { WebSocketServer, WebSocket } from 'ws';
import { WatchdogEvent } from './core/watchdog-emitter';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Watchdog Server] Started on ws://localhost:${PORT}`);

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[Watchdog Server] New client connected');

    ws.on('message', (data) => {
        try {
            const event: WatchdogEvent = JSON.parse(data.toString());
            console.log(`[Watchdog Server] Received Event: ${event.type} [${event.severity}]`);

            // Broadcast to all other clients (e.g., Dashboard)
            const broadcastData = JSON.stringify(event);
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(broadcastData);
                }
            });
        } catch (e) {
            console.error('[Watchdog Server] Error parsing event data');
        }
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('[Watchdog Server] Client disconnected');
    });
});
