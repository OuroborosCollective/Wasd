export interface Resource {
    id: string;
    name: string;
    weight: number;
}

export interface ScarcityState {
    scarcityTicks: Record<string, Record<string, number>>;
}