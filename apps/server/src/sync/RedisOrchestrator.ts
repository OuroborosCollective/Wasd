import { Redis } from 'ioredis';
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';

/**
 * Interface for synchronization messages across the WASD platform.
 * Supports both Player movement and World Editor state updates.
 */
export interface SyncMessage {
    type: 'PLAYER_MOVE' | 'EDITOR_UPDATE' | 'OBJECT_CREATE' | 'OBJECT_DELETE' | 'OBJECT_TRANSFORM';
    payload: {
        id: string;
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number; w?: number };
        scale?: { x: number; y: number; z: number };
        data?: any;
    };
    senderId: string;
    timestamp: number;
}

export class RedisOrchestrator {
    private pub: Redis;
    private sub: Redis;
    private wss: WebSocketServer;
    private clients: Map<string, WebSocket> = new Map();
    private readonly CHANNEL = 'wasd_world_sync';

    constructor(server: HttpServer, redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
        this.pub = new Redis(redisUrl);
        this.sub = new Redis(redisUrl);
        this.wss = new WebSocketServer({ server, path: '/sync' });

        this.init();
    }

    /**
     * Initializes Redis subscriptions and WebSocket connection handlers.
     */
    private async init() {
        // Subscribe to global Redis channel for cross-instance synchronization
        await this.sub.subscribe(this.CHANNEL);

        this.sub.on('message', (channel, message) => {
            if (channel === this.CHANNEL) {
                this.broadcastToLocalClients(JSON.parse(message));
            }
        });

        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = this.generateClientId();
            this.clients.set(clientId, ws);

            // Send initial connection confirmation
            ws.send(JSON.stringify({ type: 'CONNECTED', payload: { id: clientId } }));

            ws.on('message', (data: Buffer | string) => {
                try {
                    const message: SyncMessage = JSON.parse(data.toString());
                    message.senderId = clientId;
                    message.timestamp = Date.now();
                    
                    // Publish to Redis to reach all server instances
                    this.publishToRedis(message);
                } catch (err) {
                    console.error('[RedisOrchestrator] Error parsing message:', err);
                }
            });

            ws.on('close', () => {
                this.clients.delete(clientId);
                // Notify others that player/editor left
                this.publishToRedis({
                    type: 'PLAYER_MOVE',
                    payload: { id: clientId, data: { status: 'disconnected' } },
                    senderId: clientId,
                    timestamp: Date.now()
                });
            });

            ws.on('error', (error) => {
                console.error(`[RedisOrchestrator] WebSocket error for client ${clientId}:`, error);
            });
        });

        console.log('[RedisOrchestrator] Initialized Redis Pub/Sub and WebSocket Server');
    }

    /**
     * Publishes a message to the Redis channel.
     */
    private async publishToRedis(message: SyncMessage) {
        try {
            await this.pub.publish(this.CHANNEL, JSON.stringify(message));
        } catch (err) {
            console.error('[RedisOrchestrator] Redis publish error:', err);
        }
    }

    /**
     * Broadcasts a message received from Redis to all locally connected WebSocket clients.
     * Skips the original sender if they are connected to this local instance.
     */
    private broadcastToLocalClients(message: SyncMessage) {
        const data = JSON.stringify(message);
        
        this.clients.forEach((client, id) => {
            if (id !== message.senderId && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    /**
     * Utility to generate unique client identifiers.
     */
    private generateClientId(): string {
        return `client_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gracefully shuts down the Redis connections and WebSocket server.
     */
    public async shutdown() {
        await this.pub.quit();
        await this.sub.quit();
        this.wss.close();
        console.log('[RedisOrchestrator] Shutdown complete');
    }
}