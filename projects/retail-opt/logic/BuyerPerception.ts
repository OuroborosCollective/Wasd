/**
 * BuyerPerception - Retail Heatmap Tool
 * 
 * B2B buyer analysis using PerceptionLogic from stealth module.
 * Quest-Echo intensities (Sale Beacon = 0.95).
 * 10-Hz tick deterministic processing.
 */

export interface Point { x: number; y: number; }

export interface Beacon {
    id: string;
    position: Point;
    intensity: number;
    duration: number;
    createdAt: number;
    type: BeaconType;
}

export enum BeaconType {
    SALE = 'sale',
    PROMOTION = 'promotion', 
    INFORMATION = 'information',
    INTERACTION = 'interaction'
}

export interface AttentionFlow {
    source: Point;
    target: Point;
    magnitude: number;
}

export interface VirtualBuyer {
    id: string;
    position: Point;
    attention: number;
    decision: BuyerDecision;
}

export enum BuyerDecision {
    Browsing = 'browsing',
    Interested = 'interested',
    Purchase = 'purchase',
    Leaving = 'leaving'
}

export interface HeatmapCell {
    x: number;
    y: number;
    intensity: number;
    buyerCount: number;
}

export interface TickResult {
    tick: number;
    activeBeacons: number;
    activeBuyers: number;
    purchaseDecisions: number;
    heatmapCells: HeatmapCell[];
}

/** Sale beacon intensity threshold */
const SALE_BEACON_INTENSITY = 0.95;
const GRID_RESOLUTION = 100;
const TICK_INTERVAL_MS = 100;
const MAX_BUYERS = 50;

export class PerceptionLogic {
    private beacons: Beacon[] = [];
    private buyers: VirtualBuyer[] = [];
    private heatmap: Map<string, HeatmapCell> = new Map();
    private tickCount: number = 0;
    private tickInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Place echo beacon with Sale intensity.
     * Example: placeEchoBeacon('sale_item_42', {x: 10, y: 20}, 0.95, 90000)
     */
    public placeEchoBeacon(
        id: string, 
        position: Point, 
        intensity: number = SALE_BEACON_INTENSITY, 
        duration: number = 90000
    ): void {
        // Determine beacon type from ID
        const type = id.toLowerCase().includes('sale') ? BeaconType.SALE : BeaconType.INTERACTION;
        
        // Apply sale beacon intensity if applicable
        const effectiveIntensity = type === BeaconType.SALE ? SALE_BEACON_INTENSITY : intensity;
        
        this.cleanupExpiredBeacons();
        
        this.beacons.push({
            id,
            position: { x: position.x, y: position.y },
            intensity: effectiveIntensity,
            duration,
            createdAt: Date.now(),
            type
        });
    }

    /**
     * Calculate intensity at position.
     */
    public calculateIntensityAt(p: Point): number {
        this.cleanupExpiredBeacons();
        let totalIntensity = 0;

        for (const beacon of this.beacons) {
            const dx = p.x - beacon.position.x;
            const dy = p.y - beacon.position.y;
            const distSq = dx * dx + dy * dy;
            
            // Sale beacons have 0.95 weight
            const weight = beacon.type === BeaconType.SALE ? SALE_BEACON_INTENSITY : 1.0;
            
            if (distSq < 0.0001) {
                totalIntensity += beacon.intensity * weight;
            } else {
                totalIntensity += (beacon.intensity * weight) / Math.max(1, distSq);
            }
        }

        return totalIntensity;
    }

    /**
     * Get attention flow vectors.
     */
    public getAttentionFlowVectors(intensityThreshold: number = 2.0): AttentionFlow[] {
        this.cleanupExpiredBeacons();
        const activeBeacons = this.beacons.filter(b => b.intensity >= intensityThreshold);
        const flows: AttentionFlow[] = [];

        for (let i = 0; i < activeBeacons.length; i++) {
            for (let j = 0; j < activeBeacons.length; j++) {
                if (i === j) continue;

                const b1 = activeBeacons[i];
                const b2 = activeBeacons[j];
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

    /**
     * Spawn virtual buyers for simulation.
     */
    public spawnBuyers(count: number = 10): void {
        this.buyers = [];
        
        for (let i = 0; i < Math.min(count, MAX_BUYERS); i++) {
            this.buyers.push({
                id: `buyer_${i}`,
                position: { 
                    x: Math.random() * GRID_RESOLUTION, 
                    y: Math.random() * GRID_RESOLUTION 
                },
                attention: 0,
                decision: BuyerDecision.Browsing
            });
        }
    }

    /**
     * Process single tick - deterministic 10-Hz.
     */
    public processTick(): TickResult {
        this.tickCount++;
        
        // Clean expired beacons - prevents state bloat
        this.cleanupExpiredBeacons();
        
        // Reset heatmap
        this.heatmap.clear();
        
        // Process each buyer
        let purchaseDecisions = 0;
        
        for (const buyer of this.buyers) {
            // Calculate attention at current position
            const attention = this.calculateIntensityAt(buyer.position);
            buyer.attention = attention;
            
            // Update decision based on attention
            if (attention >= SALE_BEACON_INTENSITY) {
                buyer.decision = BuyerDecision.Purchase;
                purchaseDecisions++;
            } else if (attention >= 0.5) {
                buyer.decision = BuyerDecision.Interested;
            } else {
                buyer.decision = BuyerDecision.Browsing;
            }
            
            // Move buyer toward higher intensity (deterministic)
            this.moveBuyerTowardInterest(buyer);
            
            // Update heatmap cell
            this.updateHeatmapCell(buyer.position);
        }

        return {
            tick: this.tickCount,
            activeBeacons: this.beacons.length,
            activeBuyers: this.buyers.length,
            purchaseDecisions,
            heatmapCells: Array.from(this.heatmap.values())
        };
    }

    /**
     * Move buyer toward highest intensity - deterministic.
     */
    private moveBuyerTowardInterest(buyer: VirtualBuyer): void {
        let bestDirection = { x: 0, y: 0 };
        let maxIntensity = buyer.attention;

        // Check 8 directions
        const directions = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: -1 },
            { x: 1, y: -1 }, { x: -1, y: 1 }
        ];

        for (const dir of directions) {
            const testPos = { x: buyer.position.x + dir.x, y: buyer.position.y + dir.y };
            const intensity = this.calculateIntensityAt(testPos);
            
            if (intensity > maxIntensity) {
                maxIntensity = intensity;
                bestDirection = dir;
            }
        }

        // Move
        buyer.position.x = Math.max(0, Math.min(GRID_RESOLUTION, buyer.position.x + bestDirection.x * 0.5));
        buyer.position.y = Math.max(0, Math.min(GRID_RESOLUTION, buyer.position.y + bestDirection.y * 0.5));
    }

    /**
     * Update heatmap cell.
     */
    private updateHeatmapCell(position: Point): void {
        const key = `${Math.floor(position.x)}:${Math.floor(position.y)}`;
        const existing = this.heatmap.get(key);
        
        if (existing) {
            existing.intensity += 1;
            existing.buyerCount += 1;
        } else {
            this.heatmap.set(key, {
                x: Math.floor(position.x),
                y: Math.floor(position.y),
                intensity: 1,
                buyerCount: 1
            });
        }
    }

    /**
     * Start 10-Hz tick processing.
     */
    public startTicks(): void {
        if (this.tickInterval) return;
        
        this.tickInterval = setInterval(() => {
            this.processTick();
        }, TICK_INTERVAL_MS);
    }

    /**
     * Stop 10-Hz tick processing.
     */
    public stopTicks(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    /**
     * Get current heatmap.
     */
    public getHeatmap(): HeatmapCell[] {
        return Array.from(this.heatmap.values());
    }

    /**
     * Get buyers.
     */
    public getBuyers(): VirtualBuyer[] {
        return this.buyers;
    }

    /**
     * Get tick count.
     */
    public getTickCount(): number {
        return this.tickCount;
    }

    /**
     * Clean expired beacons - prevents state bloat.
     */
    private cleanupExpiredBeacons(): void {
        const now = Date.now();
        this.beacons = this.beacons.filter(b => now <= b.createdAt + b.duration);
    }

    /**
     * Clear all state.
     */
    public clear(): void {
        this.beacons = [];
        this.buyers = [];
        this.heatmap.clear();
        this.tickCount = 0;
    }
}

export default PerceptionLogic;
export { SALE_BEACON_INTENSITY, GRID_RESOLUTION, TICK_INTERVAL_MS, MAX_BUYERS };
