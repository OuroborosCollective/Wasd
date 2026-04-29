export type AREEntity = {
    id: string;
    type: string;
    properties: Record<string, any>;
};

export interface AREState {
    entities: Record<string, AREEntity>;
    metadata: {
        lastEventId: string | null;
        sequence: number;
        timestamp: number;
    };
}

export interface AREEvent {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
}

export class AREStateCompiler {
    /**
     * Pure functional state transformation unit.
     * Computes the next state deterministically based on input state and event.
     * Side-effect free.
     */
    public static compile(state: AREState, event: AREEvent): AREState {
        const nextMetadata = {
            lastEventId: event.id,
            sequence: state.metadata.sequence + 1,
            timestamp: event.timestamp
        };

        const baseState: AREState = {
            ...state,
            metadata: nextMetadata
        };

        switch (event.type) {
            case 'ENTITY_UPSERT':
                return AREStateCompiler.handleUpsert(baseState, event.payload);
            
            case 'ENTITY_PATCH':
                return AREStateCompiler.handlePatch(baseState, event.payload);
            
            case 'ENTITY_REMOVE':
                return AREStateCompiler.handleRemove(baseState, event.payload);
            
            case 'STATE_MERGE':
                return AREStateCompiler.handleMerge(baseState, event.payload);

            case 'STATE_CLEAR':
                return AREStateCompiler.getInitialState(event.timestamp);

            default:
                return baseState;
        }
    }

    private static handleUpsert(state: AREState, payload: { entity: AREEntity }): AREState {
        if (!payload.entity || !payload.entity.id) return state;
        
        return {
            ...state,
            entities: {
                ...state.entities,
                [payload.entity.id]: { ...payload.entity }
            }
        };
    }

    private static handlePatch(state: AREState, payload: { id: string, properties: Record<string, any> }): AREState {
        const target = state.entities[payload.id];
        if (!target) return state;

        return {
            ...state,
            entities: {
                ...state.entities,
                [payload.id]: {
                    ...target,
                    properties: {
                        ...target.properties,
                        ...payload.properties
                    }
                }
            }
        };
    }

    private static handleRemove(state: AREState, payload: { id: string }): AREState {
        if (!state.entities[payload.id]) return state;

        const newEntities = { ...state.entities };
        delete newEntities[payload.id];

        return {
            ...state,
            entities: newEntities
        };
    }

    private static handleMerge(state: AREState, payload: { entities: Record<string, AREEntity> }): AREState {
        return {
            ...state,
            entities: {
                ...state.entities,
                ...payload.entities
            }
        };
    }

    public static getInitialState(timestamp: number = 0): AREState {
        return {
            entities: {},
            metadata: {
                lastEventId: null,
                sequence: 0,
                timestamp: timestamp
            }
        };
    }
}