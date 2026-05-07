import { WebSocketServer, WebSocket } from 'ws';
import { WatchdogEvent } from './core/watchdog-emitter';

/**
 * Watchdog Server - Areloria WASD Core Component
 * Zentrales Relay für System-Ereignisse und Fehler-Monitoring.
 */

const PORT = process.env.WATCHDOG_PORT ? parseInt(process.env.WATCHDOG_PORT) : 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`[Watchdog Server] Started and listening on ws://localhost:${PORT}`);

const clients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    clients.add(ws);
    console.log(`[Watchdog Server] New client connection established from ${clientIp}`);

    ws.on('message', (data) => {
        let rawData = '';
        try {
            rawData = data.toString();
            const event: WatchdogEvent = JSON.parse(rawData);
            
            console.log(`[Watchdog Server] Processing Event: ${event.type} | Severity: ${event.severity} | Origin: ${event.origin || 'unknown'}`);
            
            // Detailliertes Logging bei kritischen Fehlern für CI/CD Logs
            if (event.severity === 'CRITICAL' || event.severity === 'FATAL') {
                console.error(`[Watchdog ALERT] ${event.type.toUpperCase()}: ${event.message}`);
                if (event.metadata) {
                    console.error(`[Watchdog Metadata]: ${JSON.stringify(event.metadata, null, 2)}`);
                }
            }

            // Broadcast to all other clients (e.g., GM Dashboard, Logging-Services)
            const broadcastData = JSON.stringify(event);
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    try {
                        client.send(broadcastData);
                    } catch (sendError) {
                        const error = sendError as Error;
                        console.error(`[Watchdog Server] Failed to relay message to client: ${error.message}`);
                        console.error(`[Watchdog Server] Stacktrace: ${error.stack}`);
                    }
                }
            });
        } catch (err) {
            const error = err as Error;
            console.error('[Watchdog Server] INTERNAL ERROR: Failed to parse incoming event data');
            console.error(`[Watchdog Server] Raw Data Payload: ${rawData}`);
            console.error(`[Watchdog Server] Error Message: ${error.message}`);
            console.error(`[Watchdog Server] Full Stacktrace:\n${error.stack}`);
        }
    });

    ws.on('error', (err) => {
        const error = err as Error;
        console.error(`[Watchdog Server] Socket Error for client ${clientIp}: ${error.message}`);
        console.error(`[Watchdog Server] Stacktrace: ${error.stack}`);
    });

    ws.on('close', (code, reason) => {
        clients.delete(ws);
        console.log(`[Watchdog Server] Client ${clientIp} disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
    });
});

wss.on('error', (err) => {
    const error = err as Error;
    console.error('[Watchdog Server] FATAL SERVER ERROR:');
    console.error(`[Watchdog Server] Message: ${error.message}`);
    console.error(`[Watchdog Server] Stacktrace: ${error.stack}`);
});

process.on('uncaughtException', (err) => {
    console.error('[Watchdog Server] UNCAUGHT EXCEPTION:');
    console.error(err.stack || err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Watchdog Server] UNHANDLED REJECTION at:', promise, 'reason:', reason);
});