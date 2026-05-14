import { HeuristicGoalPruner } from "./HeuristicGoalPruner.js";
import { NPCMemoryCache } from "./NPCMemoryCache.js";

export class NPCEngine {
    private tickInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE_MS = 100; // 10Hz
    private activeNPCs: Map<string, any> = new Map();

    constructor() {}

    public start(): void {
        if (this.tickInterval) return;
        this.tickInterval = setInterval(() => this.onTick(), this.TICK_RATE_MS);
    }

    public stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    private onTick(): void {
        this.activeNPCs.forEach((npc) => {
            this.processNPC(npc);
        });
    }

    private processNPC(npc: any): void {
        const cache = NPCMemoryCache.getInstance();

        // Schritt 1: Heuristische Ziele basierend auf Echo-Intensität bereinigen
        HeuristicGoalPruner.pruneByEchoIntensity(npc.id, cache);

        // Schritt 2: Pfadfindung und Zielverfolgung einleiten
        this.computePathfinding(npc);
    }

    private computePathfinding(npc: any): void {
        // Logik für die Pfadberechnung nach der Heuristik-Prüfung
    }

    public addNPC(npc: any): void {
        this.activeNPCs.set(npc.id, npc);
    }

    public removeNPC(npcId: string): void {
        this.activeNPCs.delete(npcId);
    }
}