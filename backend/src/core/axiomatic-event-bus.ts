export class AxiomaticEventBus {
    private static instance: AxiomaticEventBus;

    private constructor() {}

    public static getInstance(): AxiomaticEventBus {
        if (!AxiomaticEventBus.instance) {
            AxiomaticEventBus.instance = new AxiomaticEventBus();
        }
        return AxiomaticEventBus.instance;
    }

    public publish(type: string, payload: any): void {
        console.log(`[AxiomaticEventBus] Published ${type}:`, payload);
    }
}
