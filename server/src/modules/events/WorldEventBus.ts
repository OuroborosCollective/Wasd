export class WorldEventBus {
    public static getInstance() { return new WorldEventBus(); }
    public emit(event: string, ...args: any[]) {}
    public on(event: string, cb: any) {}
    public subscribe(event: string, cb: any) { return { unsubscribe: () => {} }; }
    public onAll(cb: any) {}
}
export type WorldEvent = any;
