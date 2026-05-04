// @ts-nocheck
import { WorldHistory } from "../history/WorldHistory";
import { NPCRelationshipSystem } from "../npc/NPCRelationshipSystem";
import { QuestSystem } from "../quest/QuestSystem";

export interface BountyQuestData {
    targetId: string;
    issuerFactionId: string;
    reward: number;
    difficulty: number;
    type: string;
    description: string;
}

export class BountySystem {
    private static instance: BountySystem;
    private threatScores: Map<string, Map<string, number>> = new Map();
    private readonly SCORE_THRESHOLD: number = 100;
    private readonly KILL_SCORE_MODIFIER: number = 20;

    private constructor() {
        this.initializeListeners();
    }

    public static getInstance(): BountySystem {
        if (!BountySystem.instance) {
            BountySystem.instance = new BountySystem();
        }
        return BountySystem.instance;
    }

    private initializeListeners(): void {
        WorldHistory.getInstance().on("combat_kill", (event: any) => {
            this.processKillEvent(event);
        });
    }

    private processKillEvent(event: { killerId: string; victimId: string; victimFactionId: string }): void {
        const { killerId, victimFactionId } = event;

        if (!killerId || !victimFactionId) {
            return;
        }

        let playerFactions = this.threatScores.get(killerId);
        if (!playerFactions) {
            playerFactions = new Map<string, number>();
            this.threatScores.set(killerId, playerFactions);
        }

        const currentScore = playerFactions.get(victimFactionId) || 0;
        const updatedScore = currentScore + this.KILL_SCORE_MODIFIER;
        playerFactions.set(victimFactionId, updatedScore);

        if (updatedScore >= this.SCORE_THRESHOLD) {
            this.generateAutonomousBounty(killerId, victimFactionId, updatedScore);
            playerFactions.set(victimFactionId, 0);
        }
    }

    public generateAutonomousBounty(playerId: string, factionId: string, currentThreat: number): void {
        const hostilityIncrease = Math.floor(currentThreat / 10);
        NPCRelationshipSystem.getInstance().updateHostility(factionId, playerId, hostilityIncrease);

        const bountyData: BountyQuestData = {
            targetId: playerId,
            issuerFactionId: factionId,
            reward: currentThreat * 50,
            difficulty: Math.min(5, Math.floor(currentThreat / 20)),
            type: "ASSASSINATION",
            description: `The faction ${factionId} has declared a bounty on ${playerId} due to excessive hostility and confirmed kills.`
        };

        QuestSystem.getInstance().registerBountyQuest(bountyData);
    }

    public getThreatScore(playerId: string, factionId: string): number {
        return this.threatScores.get(playerId)?.get(factionId) || 0;
    }

    public resetThreatScore(playerId: string, factionId: string): void {
        const playerFactions = this.threatScores.get(playerId);
        if (playerFactions) {
            playerFactions.set(factionId, 0);
        }
    }
}

export default BountySystem;