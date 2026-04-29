export interface TickState {
    entityId: string;
    life: number;
    phase: number;
    positionX: number;
}

const TICK_REGEX = /^([^|]+)\|li:(\d+)\|ph:(\d+)\|plx:(\d+)$/;

export function parseChain(chain: string): TickState | null {
    const match = TICK_REGEX.exec(chain);
    if (!match) return null;
    return {
        entityId: match[1],
        life: parseInt(match[2], 10),
        phase: parseInt(match[3], 10),
        positionX: parseInt(match[4], 10)
    };
}

export function serializeTick(state: TickState): string {
    return `${state.entityId}|li:${state.life}|ph:${state.phase}|plx:${state.positionX}`;
}

export function applyPhysicsTick(state: TickState, velocity: number): TickState {
    return {
        entityId: state.entityId,
        life: state.life,
        phase: (state.phase + 1) | 0,
        positionX: (state.positionX + velocity) | 0
    };
}