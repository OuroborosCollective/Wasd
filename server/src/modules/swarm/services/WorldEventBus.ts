// @ARE-GUARD-EXEMPT: non-sim module
/**
 * WorldEventBus.ts
 */
export class WorldEventBus {
    publish(event: string, data: any) {
        console.log(`[WorldEventBus] ${event}`, data);
    }
}