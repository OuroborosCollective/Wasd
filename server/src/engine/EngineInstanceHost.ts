// @ts-nocheck
import { AREEngineBox } from './AREEngineBox';

export interface IClientConnection {
    id: string;
    send(data: string): void;
}

export interface EnginePacket {
    clientId: string;
    type: string;
    payload: any;
    timestamp: number;
}

export class EngineInstanceHost {
    private engine: AREEngineBox;
    private clients: Map<string, IClientConnection>;
    private tickRate: number = 20; 
    private intervalId: any = null;

    constructor() {
        this.engine = new AREEngineBox();
        this.clients = new Map<string, IClientConnection>();

        this.engine.onDelta = (delta: any) => {
            this.broadcastDelta(delta);
        };
    }

    public addClient(client: IClientConnection): void {
        this.clients.set(client.id, client);
    }

    public removeClient(clientId: string): void {
        this.clients.delete(clientId);
    }

    public processIncomingPacket(clientId: string, packetData: any): void {
        const packet: EnginePacket = {
            clientId,
            type: packetData.type || 'input',
            payload: packetData.payload || {},
            timestamp: Date.now()
        };
        
        this.engine.inputQueue.push(packet);
    }

    public start(): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            try {
                this.engine.update();
            } catch (error) {
                console.error("Engine Update Error:", error);
            }
        }, this.tickRate);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private broadcastDelta(delta: any): void {
        if (this.clients.size === 0) return;

        const message = JSON.stringify({
            op: 'DELTA',
            t: Date.now(),
            d: delta
        });

        for (const [id, client] of this.clients) {
            try {
                client.send(message);
            } catch (e) {
                this.removeClient(id);
            }
        }
    }

    public getEngineState(): any {
        return this.engine.getState();
    }
}