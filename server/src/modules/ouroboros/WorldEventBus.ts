export class WorldEventBus {
    public static getInstance() { return new WorldEventBus(); }
    public emit(event: string, data: any) {}
    public on(event: string, cb: any) {}
    public onAll(cb: any) {}
}
export type WorldEvent = any;
