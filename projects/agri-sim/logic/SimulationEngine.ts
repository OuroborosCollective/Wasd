export interface GrowthNeeds {
    water: number;
    light: number;
    nutrients: number;
}

export interface Plant {
    id: string;
    type: string;
    health: number;
    growthProgress: number;
    isAlive: boolean;
    currentNeeds: GrowthNeeds;
    optimalRequirements: GrowthNeeds;
}

export type SimulationEventType = 'plantDied' | 'growthUpdate' | 'tickCompleted' | 'harvestReady';

export class SimulationEngine {
    private plants: Plant[];
    private eventListeners: Map<SimulationEventType, Function[]>;
    private tickInterval: number | null = null;

    constructor(initialPlants: Plant[] = []) {
        this.plants = initialPlants;
        this.eventListeners = new Map();
    }

    public on(event: SimulationEventType, callback: (data: any) => void): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event)?.push(callback);
    }

    private emit(event: SimulationEventType, data: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    public start(intervalMs: number = 1000): void {
        if (this.tickInterval) return;
        this.tickInterval = window.setInterval(() => this.tick(), intervalMs);
    }

    public stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    public tick(): void {
        for (let i = 0; i < this.plants.length; i++) {
            const plant = this.plants[i];
            if (!plant.isAlive) continue;

            this.processGrowthLogic(plant);
            this.checkVitalSigns(plant);
        }
        this.emit('tickCompleted', [...this.plants]);
    }

    private processGrowthLogic(plant: Plant): void {
        const waterDeficit = Math.abs(plant.optimalRequirements.water - plant.currentNeeds.water);
        const lightDeficit = Math.abs(plant.optimalRequirements.light - plant.currentNeeds.light);
        const nutrientDeficit = Math.abs(plant.optimalRequirements.nutrients - plant.currentNeeds.nutrients);

        const totalStress = (waterDeficit * 1.5) + (lightDeficit * 0.8) + (nutrientDeficit * 1.2);

        if (totalStress < 15) {
            plant.health = Math.min(100, plant.health + 1);
            plant.growthProgress += 2.5;
            this.emit('growthUpdate', { id: plant.id, progress: plant.growthProgress });
        } else if (totalStress > 50) {
            plant.health -= (totalStress / 10);
        } else {
            plant.growthProgress += 0.5;
        }

        if (plant.growthProgress >= 100) {
            plant.growthProgress = 100;
            this.emit('harvestReady', plant);
        }
    }

    private checkVitalSigns(plant: Plant): void {
        if (plant.health <= 0) {
            plant.health = 0;
            plant.isAlive = false;
            this.emit('plantDied', {
                id: plant.id,
                type: plant.type,
                timestamp: Date.now()
            });
        }
    }

    public addPlant(plant: Plant): void {
        this.plants.push(plant);
    }

    public updateEnvironment(plantId: string, needs: Partial<GrowthNeeds>): void {
        const plant = this.plants.find(p => p.id === plantId);
        if (plant) {
            plant.currentNeeds = { ...plant.currentNeeds, ...needs };
        }
    }

    public getPlants(): Plant[] {
        return [...this.plants];
    }
}