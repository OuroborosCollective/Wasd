/**
 * WorldEventBus.ts
 */
export class WorldEventBus {
    publish(event: string, data: any) {
        console.log(`[WorldEventBus] ${event}`, data);
    }

    emit(event: string, data?: any) {
        this.publish(event, data);
    }

    subscribe(_event: string, _handler: (data: any) => void) {
        // Stub: wire real pub/sub when economy events are connected.
        void _event;
        void _handler;
    }
}