export enum InteractionType {
    COMMAND = "COMMAND",
    EVENT = "EVENT",
    SYNC = "SYNC",
    ACK = "ACK",
    ERROR = "ERROR"
}

export interface InteractionEnvelope<T = any> {
    id: string;
    correlationId?: string;
    timestamp: number;
    type: InteractionType;
    namespace: string;
    payload: T;
    metadata: InteractionMetadata;
}

export interface InteractionMetadata {
    clientId: string;
    userId?: string;
    sequence: number;
    version: string;
}

export type InteractionHandler<T = any> = (envelope: InteractionEnvelope<T>) => void | Promise<void>;

export class InteractionRegistry {
    private handlers: Map<string, InteractionHandler[]> = new Map();

    public subscribe<T>(type: InteractionType, handler: InteractionHandler<T>): void {
        const current = this.handlers.get(type) || [];
        this.handlers.set(type, [...current, handler]);
    }

    public async dispatch<T>(envelope: InteractionEnvelope<T>): Promise<void> {
        const handlers = this.handlers.get(envelope.type) || [];
        await Promise.all(handlers.map(handler => handler(envelope)));
    }
}

export class InteractionFactory {
    private static sequenceCounter = 0;

    public static create<T>(
        type: InteractionType,
        namespace: string,
        payload: T,
        clientId: string,
        correlationId?: string
    ): InteractionEnvelope<T> {
        return {
            id: this.generateUUID(),
            correlationId,
            timestamp: Date.now(),
            type,
            namespace,
            payload,
            metadata: {
                clientId,
                sequence: ++this.sequenceCounter,
                version: "1.0.0"
            }
        };
    }

    private static generateUUID(): string {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
}

export interface SyncPayload {
    stateHash: string;
    lastSequence: number;
    patch?: any;
}

export class InteractionValidator {
    public static validate(envelope: InteractionEnvelope): boolean {
        return !!(
            envelope.id &&
            envelope.type &&
            envelope.metadata &&
            typeof envelope.metadata.sequence === 'number'
        );
    }
}