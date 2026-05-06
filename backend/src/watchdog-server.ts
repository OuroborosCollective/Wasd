import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('Watchdog Client connected');
    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        console.log(`[Watchdog Event] ${data.event}:`, data.data);
    });
});

console.log('Watchdog Server started on port 8080');
