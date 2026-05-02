import { BountySystem } from "../bounty/BountySystem";

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
        const now = Date.now();
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
            
            await this.bountySystem.triggerThreatRecalculation(playerId, {
                intensityLevel: playerKills.length,
                reason: "MASS_KILL_EVENT",
                timestamp: Date.now(),
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
