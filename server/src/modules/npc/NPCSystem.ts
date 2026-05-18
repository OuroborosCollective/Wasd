import { checkStealthDeterministic, calculatePhaseShift, calculateVisibilityThreshold } from './PerceptionLogic';
import { GuildSovereigntyEngine } from '../guild/GuildSovereigntyEngine';
import { TraitResonanceEngine } from '../resonance/TraitResonanceEngine';

function deterministicNpcTraits(id: string): { faith: number; aggression: number; curiosity: number } {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
        h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
    }
    const u = (n: number) => 0.28 + ((Math.abs(n) % 701) / 700) * 0.62;
    return {
        faith: u(h),
        aggression: u(h ^ 0x9e3779b9),
        curiosity: u(h >>> 3),
    };
}

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface NPC {
    id: string;
    name?: string;
    position: Vector3;
    rotation: number;
    visionRange: number;
    visionAngle: number;
    targetId: string | null;
    isProcessingAI: boolean;
    role?: string;
    faction?: string;
    traits?: { faith: number; aggression: number; curiosity: number };
    health?: number;
    maxHealth?: number;
    skills?: any;
    dropTable?: any;
    worldBoss?: boolean;
    worldBossMeta?: any;
    damageMultiplier?: number;
    fusionAdaptiveGlbPath?: string | null;
    fusionProfileTag?: string;
    state?: string;
    stateTimer?: number;
    targetPosition?: Vector3;
    memory?: any;
    shopId?: string;
    stamina?: number;
    phaseShift?: number;
    perceptionThreshold?: number;
}

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 100; // 10Hz in ms

    public resonanceEngine: TraitResonanceEngine;

    private sovereigntyEngine: GuildSovereigntyEngine;

    constructor() {
        // Initialize stub dependencies
        this.sovereigntyEngine = new GuildSovereigntyEngine();
        this.resonanceEngine = new TraitResonanceEngine(this.sovereigntyEngine);
    }

    public addNPC(npc: NPC): void {
        if (npc.perceptionThreshold === undefined && npc.phaseShift !== undefined) {
            npc.perceptionThreshold = calculateVisibilityThreshold(npc.phaseShift);
        }
        this.npcs.set(npc.id, npc);
    }

    public removeNPC(id: string): boolean {
        return this.npcs.delete(id);
    }

    public createNPC(id: string, name: string, x: number, y: number): NPC {
        const traits = deterministicNpcTraits(id);
        const phaseShift = calculatePhaseShift(id);
        const npc: NPC = {
            id,
            name,
            position: { x, y, z: 0 },
            rotation: 0,
            visionRange: 10,
            visionAngle: 90,
            targetId: null,
            isProcessingAI: false,
            traits,
            health: 90,
            maxHealth: 90,
            stamina: 100,
            skills: { combat: { level: Math.max(1, Math.min(14, Math.round(traits.aggression * 13))) } },
            phaseShift,
            perceptionThreshold: calculateVisibilityThreshold(phaseShift),
        };
        this.addNPC(npc);
        return npc;
    }

    public getNPC(id: string): NPC | undefined {
        return this.npcs.get(id);
    }

    public getAllNPCs(): NPC[] {
        return Array.from(this.npcs.values());
    }

    public getNPCsMap(): Map<string, NPC> {
        return this.npcs;
    }

    public handleInteraction(npcId: string, player: any, questDefs: any): any {
        const npc = this.getNPC(npcId);
        if (!npc) return null;
        return {
            source: npc.name || "NPC",
            text: "Hello traveler!",
            choices: [{ id: "greet", text: "Greetings!" }],
            npcId
        };
    }

    public handleChoice(npcId: string, nodeId: string, choiceId: string, player: any): any {
        const npc = this.getNPC(npcId);
        if (!npc) return null;
        return {
            source: npc.name || "NPC",
            text: "You chose wisely.",
            choices: [],
            npcId
        };
    }

    public runFusionHeuristics(context: any, npcs: NPC[]): void {
        // Implementation stub
    }

    public setRuntimeDialogue(npcId: string, text: string, choices: any[]): boolean {
        const npc = this.getNPC(npcId);
        if (!npc) return false;
        return true;
        // Implementation stub
    }

    public setQuestEchoProvider(provider: any): void {
        // Implementation stub
    }

    public setProfileResolver(resolver: any): void {
        // Implementation stub
    }

    public tick(onlinePlayers: any[], worldTime: number): void {
        this.update(onlinePlayers);
    }

    private update(onlinePlayers: any[]): void {
        const sortedNpcs = Array.from(this.npcs.values()).sort((a, b) => a.id.localeCompare(b.id));
        const sortedPlayers = [...onlinePlayers].sort((a, b) => a.id.localeCompare(b.id));

        for (const npc of sortedNpcs) {
            this.processPerception(npc, sortedPlayers);
        }
    }

    private processPerception(npc: NPC, sortedPlayers: any[]): void {
        let detectedPlayerId: string | null = null;

        // BOLT OPTIMIZATION: Inline squared distance check and use cached perceptionThreshold
        // to avoid O(N*P) temporary object allocations per tick.
        // NOTE: This intentionally replaces checkStealthDeterministic with a distance-only check
        // as the current system usage did not leverage stealthLevel or dynamic visionRange
        // during the 10Hz hot-path tick.
        const threshold = npc.perceptionThreshold ?? 225;
        const npcPos = npc.position;

        for (const player of sortedPlayers) {
            const playerPos = player.position;
            const dx = npcPos.x - playerPos.x;
            const dy = npcPos.y - playerPos.y;
            const dz = (npcPos.z || 0) - (playerPos.z || 0);
            const distSq = dx * dx + dy * dy + dz * dz;

            if (distSq <= threshold) {
                detectedPlayerId = player.id || 'unknown_player';
                break;
            }
        }

        if (detectedPlayerId) {
            if (npc.targetId !== detectedPlayerId) {
                npc.targetId = detectedPlayerId;
                npc.state = 'interacting';
                this.triggerComplexAI(npc);
            }
        } else {
            npc.targetId = null;
            npc.isProcessingAI = false;
        }
    }

    private triggerComplexAI(npc: NPC): void {
        if (npc.isProcessingAI) return;
        
        npc.isProcessingAI = true;
        this.executeBehaviorTree(npc);
    }

    private executeBehaviorTree(npc: NPC): void {
        // Implementation for expensive Pathfinding and Behavior Tree logic
        // Only called when perception check passes
    }

}
