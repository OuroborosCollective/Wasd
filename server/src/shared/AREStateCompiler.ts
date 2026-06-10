export interface KappaPos {
    x: number;
    y: number;
}

// WorldLogicalState is now in server/src/core/are/ChunkLayerState.ts
// Re-export for backward compatibility
export type { WorldLogicalState } from '../core/are/ChunkLayerState.js';

export interface AREPayload {
    resonance: number;
    phaseShift: number;
    plexity: number;
    entropy?: number;
    vector?: KappaPos;
    /** World state vectors for 2D client resonance scoring */
    worldState?: import('../core/are/ChunkLayerState.js').WorldLogicalState;
}

export interface AREEntity {
    id: string;
    type: string;
    position: KappaPos;
    payload: AREPayload;
    lastUpdate: number;
}

export interface AREState {
    tick: number;
    seed: number;
    entities: Record<string, AREEntity>;
    checksum: string;
}

export interface AREAction {
    type: string;
    playerId: string;
    payload: Partial<AREPayload>;
    targetId?: string;
    tick: number;
}

export class AREStateCompiler {
    public static createKappaPos(x: number, y: number): KappaPos {
        return {
            x: Math.floor(x),
            y: Math.floor(y)
        };
    }

    public static validateIntegrity(pos: KappaPos): boolean {
        return Number.isInteger(pos.x) && Number.isInteger(pos.y);
    }

    public static generateDeterministicHash(state: AREState): string {
        const sortedKeys = Object.keys(state.entities).sort();
        const simplifiedEntities = sortedKeys.map(key => {
            const e = state.entities[key];
            return `${e.id}:${e.position.x},${e.position.y}:${e.payload.resonance}`;
        });
        
        const data = `${state.tick}|${state.seed}|${simplifiedEntities.join(';')}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(16);
    }

    public static compile(state: AREState): string {
        return JSON.stringify({
            ...state,
            checksum: this.generateDeterministicHash(state)
        });
    }
}