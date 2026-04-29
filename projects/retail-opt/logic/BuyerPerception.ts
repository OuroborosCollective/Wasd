export interface Point {
    x: number;
    y: number;
}

export interface Beacon {
    id: string;
    position: Point;
    intensity: number;
    duration: number;
    createdAt: number;
}

export interface AttentionFlow {
    source: Point;
    target: Point;
    magnitude: number;
}

export class PerceptionLogic {
    private beacons: Beacon[] = [];

    public placeEchoBeacon(id: string, position: Point, intensity: number, duration: number): void {
        this.cleanupExpiredBeacons();
        this.beacons.push({
            id,
            position,
            intensity,
            duration,
            createdAt: Date.now()
        });
    }

    public calculateIntensityAt(p: Point): number {
        const now = Date.now();
        let totalIntensity = 0;

        for (const beacon of this.beacons) {
            if (now > beacon.createdAt + beacon.duration) continue;

            const dx = p.x - beacon.position.x;
            const dy = p.y - beacon.position.y;
            const distSq = dx * dx + dy * dy;

            const weight = beacon.id.toLowerCase().includes("sale") ? 0.95 : 1.0;
            
            if (distSq < 0.0001) {
                totalIntensity += beacon.intensity * weight;
            } else {
                totalIntensity += (beacon.intensity * weight) / distSq;
            }
        }

        return totalIntensity;
    }

    public getAttentionFlowVectors(intensityThreshold: number = 2.0): AttentionFlow[] {
        this.cleanupExpiredBeacons();
        const clusters = this.beacons.filter(b => b.intensity >= intensityThreshold);
        const flows: AttentionFlow[] = [];

        for (let i = 0; i < clusters.length; i++) {
            for (let j = 0; j < clusters.length; j++) {
                if (i === j) continue;

                const b1 = clusters[i];
                const b2 = clusters[j];

                const dx = b2.position.x - b1.position.x;
                const dy = b2.position.y - b1.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    flows.push({
                        source: b1.position,
                        target: b2.position,
                        magnitude: (b1.intensity * b2.intensity) / dist
                    });
                }
            }
        }

        return flows;
    }

    private cleanupExpiredBeacons(): void {
        const now = Date.now();
        this.beacons = this.beacons.filter(b => now <= b.createdAt + b.duration);
    }
}