import { EventEmitter } from "events";

export class WorldEventBus extends EventEmitter {
    private static instance: WorldEventBus;
    public static getInstance(): WorldEventBus {
        if (!this.instance) this.instance = new WorldEventBus();
        return this.instance;
    }
}
