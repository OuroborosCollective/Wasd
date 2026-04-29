export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface EntityState {
    logicalIndex: string;
    position: Vector3;
    velocity: Vector3;
    acceleration: Vector3;
    previousAcceleration: Vector3;
    kappaPos: number;
    resonance: number;
}

export class ProductionTick {
    private static readonly TICK_INTERVAL_MS = 100;
    private static readonly TIME_STEP = ProductionTick.TICK_INTERVAL_MS / 1000;

    public processEntities(entities: EntityState[]): EntityState[] {
        const updatedEntities: EntityState[] = [];

        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            
            const nextPosition: Vector3 = {
                x: entity.position.x + (entity.velocity.x * ProductionTick.TIME_STEP) + (0.5 * entity.acceleration.x * Math.pow(ProductionTick.TIME_STEP, 2)),
                y: entity.position.y + (entity.velocity.y * ProductionTick.TIME_STEP) + (0.5 * entity.acceleration.y * Math.pow(ProductionTick.TIME_STEP, 2)),
                z: entity.position.z + (entity.velocity.z * ProductionTick.TIME_STEP) + (0.5 * entity.acceleration.z * Math.pow(ProductionTick.TIME_STEP, 2))
            };

            const kappaPos = Number(Math.sqrt(
                nextPosition.x * nextPosition.x +
                nextPosition.y * nextPosition.y +
                nextPosition.z * nextPosition.z
            ).toFixed(8));

            const jerk: Vector3 = {
                x: (entity.acceleration.x - entity.previousAcceleration.x) / ProductionTick.TIME_STEP,
                y: (entity.acceleration.y - entity.previousAcceleration.y) / ProductionTick.TIME_STEP,
                z: (entity.acceleration.z - entity.previousAcceleration.z) / ProductionTick.TIME_STEP
            };

            const resonance = Math.sqrt(
                Math.pow(jerk.x, 2) + 
                Math.pow(jerk.y, 2) + 
                Math.pow(jerk.z, 2)
            );

            updatedEntities.push({
                ...entity,
                position: nextPosition,
                previousAcceleration: { ...entity.acceleration },
                kappaPos,
                resonance
            });
        }

        return updatedEntities.sort((a, b) => a.logicalIndex.localeCompare(b.logicalIndex));
    }
}