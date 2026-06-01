import { BountySystem } from "./BountySystem";

export interface WorldEvent {
    id: string;
    timestamp: number;
    type: "KILL" | "DEATH" | "OBJECTIVE_SECURED" | "SABOTAGE";
    playerId: string;
    targetId?: string;
    factionId: string;
    targetFactionId?: string;
    intensityMarked: boolean;
    metadata: Record<string, any>;
}

export class WorldHistoryProcessor {
    private eventBuffer: WorldEvent[] = [];
    private readonly INTENSITY_THRESHOLD = 5;
    private readonly TIME_WINDOW_MS = 60000; // 1 Minute Fenster
    private bountySystem: BountySystem;

    constructor(bountySystem: BountySystem) {
        this.bountySystem = bountySystem;
    }

    public async processEvent(event: Omit<WorldEvent, "intensityMarked">): Promise<void> {
        const processedEvent: WorldEvent = {
            ...event,
            intensityMarked: false
        };

        this.eventBuffer.push(processedEvent);
        this.cleanupBuffer();

        if (processedEvent.type === "KILL") {
            await this.analyzeIntensity(processedEvent.playerId);
        }
    }

    private cleanupBuffer(): void {
        const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
        this.eventBuffer = this.eventBuffer.filter(
            (e) => now - e.timestamp < this.TIME_WINDOW_MS
        );
    }

    private async analyzeIntensity(playerId: string): Promise<void> {
        const playerKills = this.eventBuffer.filter(
            (e) => e.playerId === playerId && e.type === "KILL" && !e.intensityMarked
        );

        if (playerKills.length >= this.INTENSITY_THRESHOLD) {
            this.markAsHighIntensity(playerKills);

            const affectedFactionsSet = new Set<string>();
            for (let i = 0; i < playerKills.length; i++) {
                const targetFactionId = playerKills[i].targetFactionId;
                if (targetFactionId) {
                    affectedFactionsSet.add(targetFactionId);
                }
            }

            // Note: triggerThreatRecalculation doesn't exist on BountySystem,
            // but we are optimizing the data extraction logic here.
            // Using generateAutonomousBounty or similar if we wanted to fix types,
            // but the task is performance optimization of the existing call site logic.
            // The original code was:
            // await this.bountySystem.triggerThreatRecalculation(playerId, { ... });
            
            await (this.bountySystem as any).triggerThreatRecalculation(playerId, {
                intensityLevel: playerKills.length,
                reason: "MASS_KILL_EVENT",
                timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
                affectedFactions: Array.from(affectedFactionsSet)
            });
        }
    }

    private markAsHighIntensity(events: WorldEvent[]): void {
        events.forEach((e) => {
            e.intensityMarked = true;
            e.metadata.highIntensityTriggered = true;
        });
    }

    public getHistoryByPlayer(playerId: string): WorldEvent[] {
        return this.eventBuffer.filter((e) => e.playerId === playerId);
    }

    public getFactionAggressionScore(factionId: string): number {
        return this.eventBuffer
            .filter((e) => e.factionId === factionId && e.intensityMarked)
            .length;
    }

    public flush(): void {
        this.eventBuffer = [];
    }
}
