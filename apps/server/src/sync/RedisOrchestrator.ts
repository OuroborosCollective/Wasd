import { Redis } from 'ioredis';
import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';

/**
 * Enhanced SyncMessage to support consolidated Workspace and Agent synchronization.
 */
export interface SyncMessage {
    type: 
        | 'PLAYER_MOVE' 
        | 'EDITOR_UPDATE' 
        | 'OBJECT_CREATE' 
        | 'OBJECT_DELETE' 
        | 'OBJECT_TRANSFORM'
        | 'AGENT_UPDATE' 
        | 'AGENT_ACTION'
        | 'WORKSPACE_SYNC'
        | 'WORKSPACE_PATCH';
    payload: {
        id: string;
        workspaceId?: string;
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number; w?: number };
        scale?: { x: number; y: number; z: number };
        status?: 'IDLE' | 'THINKING' | 'BUSY' | 'ERROR' | 'OFFLINE';
        action?: string;
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
    private readonly STATE_PREFIX = 'wasd_state:';

    constructor(server: HttpServer, redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379') {
        this.pub = new Redis(redisUrl);
        this.sub = new Redis(redisUrl);
        this.wss = new WebSocketServer({ server, path: '/sync' });

        this.init();
    }

    private async init() {
        await this.sub.subscribe(this.CHANNEL);

        this.sub.on('message', (channel, message) => {
            if (channel === this.CHANNEL) {
                try {
                    const parsedMessage: SyncMessage = JSON.parse(message);
                    this.broadcastToLocalClients(parsedMessage);
                } catch (err) {
                    console.error('[RedisOrchestrator] Error parsing Redis message:', err);
                }
            }
        });

        this.wss.on('connection', (ws: WebSocket) => {
            const clientId = this.generateClientId();
            this.clients.set(clientId, ws);

            ws.send(JSON.stringify({ 
                type: 'CONNECTED', 
                payload: { id: clientId },
                timestamp: Date.now() 
            }));

            // Send current agent and workspace states to new client
            this.syncInitialState(ws);

            ws.on('message', async (data: Buffer | string) => {
                try {
                    const message: SyncMessage = JSON.parse(data.toString());
                    message.senderId = clientId;
                    message.timestamp = Date.now();
                    
                    // Intercept specific types to persist state in Redis
                    if (message.type === 'AGENT_UPDATE' || message.type === 'WORKSPACE_SYNC') {
                        await this.persistState(message);
                    }

                    this.publishToRedis(message);
                } catch (err) {
                    console.error('[RedisOrchestrator] Error handling message:', err);
                }
            });

            ws.on('close', () => {
                this.clients.delete(clientId);
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

        console.log('[RedisOrchestrator] Initialized with Workspace & Agent support');
    }

    /**
     * Persists critical state (Agents/Workspace) to Redis for persistence and new client bootstrapping.
     */
    private async persistState(message: SyncMessage) {
        const key = `${this.STATE_PREFIX}${message.type.toLowerCase()}:${message.payload.workspaceId || 'global'}`;
        try {
            await this.pub.hset(key, message.payload.id, JSON.stringify({
                ...message.payload,
                lastUpdate: message.timestamp,
                updatedBy: message.senderId
            }));
        } catch (err) {
            console.error('[RedisOrchestrator] Failed to persist state:', err);
        }
    }

    /**
     * Fetches and sends current world/agent state to a newly connected client.
     */
    private async syncInitialState(ws: WebSocket) {
        try {
            const keys = await this.pub.keys(`${this.STATE_PREFIX}*`);
            for (const key of keys) {
                const states = await this.pub.hgetall(key);
                for (const id in states) {
                    const payload = JSON.parse(states[id]);
                    const type = key.includes('agent_update') ? 'AGENT_UPDATE' : 'WORKSPACE_SYNC';
                    
                    ws.send(JSON.stringify({
                        type,
                        payload,
                        senderId: 'SYSTEM_SYNC',
                        timestamp: Date.now()
                    }));
                }
            }
        } catch (err) {
            console.error('[RedisOrchestrator] Error during initial sync:', err);
        }
    }

    private async publishToRedis(message: SyncMessage) {
        try {
            await this.pub.publish(this.CHANNEL, JSON.stringify(message));
        } catch (err) {
            console.error('[RedisOrchestrator] Redis publish error:', err);
        }
    }

    private broadcastToLocalClients(message: SyncMessage) {
        const data = JSON.stringify(message);
        this.clients.forEach((client, id) => {
            if (id !== message.senderId && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    }

    private generateClientId(): string {
        return `node_${process.pid}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public async shutdown() {
        await this.pub.quit();
        await this.sub.quit();
        this.wss.close();
        console.log('[RedisOrchestrator] Graceful shutdown complete');
    }
}