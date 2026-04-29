export interface Plant {
    health: number;
    needs: {
        water: number;
    };
}

export function updatePlantNeeds(plant: Plant, decayMultiplier: number): void {
    const waterDecay = 0.01 * decayMultiplier;
    plant.needs.water = Math.max(0, plant.needs.water - waterDecay);

    if (plant.needs.water <= 0) {
        plant.health = Math.max(0, plant.health - 1.0);
    }
}