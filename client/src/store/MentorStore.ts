import { signal, computed } from "@preact/signals-core";

export interface LiveStats {
    activeSessions: number;
    menteeCount: number;
    mentorCount: number;
    totalLootProcessed: number;
    averageSynergyRating: number;
}

export interface SynergyEffect {
    playerId: string;
    sourceId: string;
    type: "experience" | "loot_quality" | "damage" | "defense";
    value: number;
    expiresAt: number;
}

export type SyncStatus = "idle" | "connecting" | "synchronized" | "desync" | "error";

export class MentorStore {
    private static instance: MentorStore;

    public readonly stats = signal<LiveStats>({
        activeSessions: 0,
        menteeCount: 0,
        mentorCount: 0,
        totalLootProcessed: 0,
        averageSynergyRating: 0
    });

    public readonly synergies = signal<SynergyEffect[]>([]);
    public readonly syncStatus = signal<SyncStatus>("idle");
    public readonly lastSyncTimestamp = signal<number | null>(null);
    public readonly connectedPlayers = signal<string[]>([]);

    private constructor() {}

    public static getInstance(): MentorStore {
        if (!MentorStore.instance) {
            MentorStore.instance = new MentorStore();
        }
        return MentorStore.instance;
    }

    public updateStats(newStats: Partial<LiveStats>): void {
        this.stats.value = { ...this.stats.value, ...newStats };
    }

    public setSyncStatus(status: SyncStatus): void {
        this.syncStatus.value = status;
        if (status === "synchronized") {
            this.lastSyncTimestamp.value = Date.now();
        }
    }

    public addSynergyEffect(effect: SynergyEffect): void {
        const current = [...this.synergies.value];
        const index = current.findIndex(e => e.playerId === effect.playerId && e.type === effect.type);
        
        if (index !== -1) {
            current[index] = effect;
        } else {
            current.push(effect);
        }
        this.synergies.value = current;
    }

    public removeSynergyEffect(playerId: string, type: string): void {
        this.synergies.value = this.synergies.value.filter(
            e => !(e.playerId === playerId && e.type === type)
        );
    }

    public cleanupExpiredSynergies(): void {
        const now = Date.now();
        this.synergies.value = this.synergies.value.filter(e => e.expiresAt > now);
    }

    public setConnectedPlayers(playerIds: string[]): void {
        this.connectedPlayers.value = playerIds;
    }

    public handleSocketMessage(event: string, payload: any): void {
        switch (event) {
            case "STATS_UPDATE":
                this.updateStats(payload);
                break;
            case "SYNERGY_APPLIED":
                this.addSynergyEffect(payload);
                break;
            case "SYNERGY_EXPIRED":
                this.removeSynergyEffect(payload.playerId, payload.type);
                break;
            case "LOOT_SYNC_STATUS":
                this.setSyncStatus(payload.status);
                break;
            case "PLAYER_LIST_UPDATE":
                this.setConnectedPlayers(payload.players);
                break;
        }
    }

    public readonly activeSynergiesCount = computed(() => {
        return this.synergies.value.length;
    });

    public readonly totalSynergyBonus = computed(() => {
        return this.synergies.value.reduce((acc, curr) => acc + curr.value, 0);
    });

    public readonly isSynchronized = computed(() => {
        return this.syncStatus.value === "synchronized";
    });
}

export const mentorStore = MentorStore.getInstance();