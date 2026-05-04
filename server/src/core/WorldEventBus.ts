// @ts-nocheck
type WorldEventMap = {
    'scarcity_event': {
        resourceId: string;
        multiplier: number;
        durationMinutes: number;
        affectedRegions: string[];
    };
    'warfront_start': {
        regionId: string;
        factions: string[];
        strategicValue: number;
        startTime: number;
    };
};

type WorldEventListener<K extends keyof WorldEventMap> = (data: WorldEventMap[K]) => void;

export class WorldEventBus {
    private static instance: WorldEventBus;
    private listeners: { [K in keyof WorldEventMap]?: WorldEventListener<K>[] } = {};

    private constructor() {}

    public static getInstance(): WorldEventBus {
        if (!WorldEventBus.instance) {
            WorldEventBus.instance = new WorldEventBus();
        }
        return WorldEventBus.instance;
    }

    public subscribe<K extends keyof WorldEventMap>(
        event: K,
        callback: WorldEventListener<K>
    ): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event]?.push(callback);
    }

    public unsubscribe<K extends keyof WorldEventMap>(
        event: K,
        callback: WorldEventListener<K>
    ): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event]?.filter(cb => cb !== callback);
    }

    public emit<K extends keyof WorldEventMap>(
        event: K,
        payload: WorldEventMap[K]
    ): void {
        const eventListeners = this.listeners[event];
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in WorldEventBus listener for ${event}:`, error);
                }
            });
        }
    }

    public clearListeners<K extends keyof WorldEventMap>(event?: K): void {
        if (event) {
            delete this.listeners[event];
        } else {
            this.listeners = {};
        }
    }
}

export const worldEventBus = WorldEventBus.getInstance();