export interface EntityState {
    id: string;
    x: number;
    y: number;
    rotation: number;
    [key: string]: any;
}

export interface GameSnapshot {
    timestamp: number;
    entities: Map<string, EntityState>;
}

export class InterpolationManager {
    private snapshotBuffer: GameSnapshot[] = [];
    private readonly interpolationDelay: number = 100;
    private readonly maxBufferSize: number = 20;

    public addSnapshot(timestamp: number, entities: Map<string, EntityState>): void {
        this.snapshotBuffer.push({ timestamp, entities });
        this.snapshotBuffer.sort((a, b) => a.timestamp - b.timestamp);
        
        if (this.snapshotBuffer.length > this.maxBufferSize) {
            this.snapshotBuffer.shift();
        }
    }

    public getInterpolatedFrame(renderTime: number): Map<string, EntityState> {
        const targetTime = renderTime - this.interpolationDelay;
        const interpolatedFrame = new Map<string, EntityState>();

        if (this.snapshotBuffer.length < 2) {
            return this.snapshotBuffer.length === 1 ? this.snapshotBuffer[0].entities : interpolatedFrame;
        }

        let i = 0;
        for (; i < this.snapshotBuffer.length - 2; i++) {
            if (this.snapshotBuffer[i + 1].timestamp > targetTime) {
                break;
            }
        }

        const startNode = this.snapshotBuffer[i];
        const endNode = this.snapshotBuffer[i + 1];

        if (targetTime < startNode.timestamp) {
            return startNode.entities;
        }
        if (targetTime > endNode.timestamp) {
            return endNode.entities;
        }

        const alpha = (targetTime - startNode.timestamp) / (endNode.timestamp - startNode.timestamp);

        startNode.entities.forEach((startEntity, id) => {
            const endEntity = endNode.entities.get(id);
            if (endEntity) {
                interpolatedFrame.set(id, this.interpolateEntity(startEntity, endEntity, alpha));
            } else {
                interpolatedFrame.set(id, startEntity);
            }
        });

        return interpolatedFrame;
    }

    private interpolateEntity(start: EntityState, end: EntityState, alpha: number): EntityState {
        return {
            ...start,
            x: this.lerp(start.x, end.x, alpha),
            y: this.lerp(start.y, end.y, alpha),
            rotation: this.lerpRotation(start.rotation, end.rotation, alpha)
        };
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private lerpRotation(a: number, b: number, t: number): number {
        let diff = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
        if (diff < -Math.PI) diff += Math.PI * 2;
        return a + diff * t;
    }

    public clear(): void {
        this.snapshotBuffer = [];
    }
}