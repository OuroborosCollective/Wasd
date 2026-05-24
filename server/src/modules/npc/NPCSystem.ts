import { checkStealthDeterministic, calculatePhaseShift } from './PerceptionLogic';
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
}

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private npcsDirty: boolean = true;
    private cachedSortedNpcs: NPC[] = [];
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
        this.npcs.set(npc.id, npc);
        this.npcsDirty = true;
    }

    public removeNPC(id: string): boolean {
        const deleted = this.npcs.delete(id);
        if (deleted) this.npcsDirty = true;
        return deleted;
    }

    public createNPC(id: string, name: string, x: number, y: number): NPC {
        const traits = deterministicNpcTraits(id);
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
            phaseShift: calculatePhaseShift(id),
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
        if (this.npcsDirty) {
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) =>
                String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
            );
            this.npcsDirty = false;
        }

        const sortedPlayers = [...onlinePlayers].sort((a, b) =>
            String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
        );

        // Pre-calculate player contexts once per tick to avoid redundant allocations in the perception loop
        const playerContexts = sortedPlayers.map(player => ({
            id: player?.id,
            stealthState: {
                playerId: String(player?.id ?? ""),
                position: NPCSystem.vec3ForPerception(player?.position),
                stealthLevel: player?.stealthValue ?? 0,
                isCrouching: false, // Crouching state not yet implemented in PlayerSystem
                lastVisibleTick: 0
            }
        }));

        for (const npc of this.cachedSortedNpcs) {
            this.processPerception(npc, playerContexts);
        }
    }

    /** Perception uses raw arithmetic; missing z (or non-finite coords) must not yield NaN distances. */
    private static vec3ForPerception(pos: any): { x: number; y: number; z: number } {
        return {
            x: Number.isFinite(Number(pos?.x)) ? Number(pos.x) : 0,
            y: Number.isFinite(Number(pos?.y)) ? Number(pos.y) : 0,
            z: Number.isFinite(Number(pos?.z)) ? Number(pos.z) : 0,
        };
    }

    /** Optimized squared distance check to avoid object allocations in broad-phase culling. */
    private static isWithinRangeSquared(
        posA: { x: number; y: number; z: number },
        posB: { x: number; y: number; z: number },
        thresholdSquared: number
    ): boolean {
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dz = posA.z - posB.z;
        return (dx * dx + dy * dy + dz * dz) <= thresholdSquared;
    }

    private processPerception(npc: NPC, playerContexts: any[]): void {
        let detectedPlayerId: string | null = null;
        const npcPos = NPCSystem.vec3ForPerception(npc.position);

        // Broad-phase culling: use squared distance for fast early exit.
        // PerceptionLogic.ts uses 225 as BASE_VISIBILITY_THRESHOLD (15^2).
        // We use a safe upper bound (e.g., max perception range) for culling.
        const maxRangeSquared = (npc.visionRange * 1.5) * (npc.visionRange * 1.5);

        const npcPerceptionState = {
            npcId: npc.id,
            position: npcPos,
            phaseShift: npc.phaseShift ?? 0,
            perceptionRadius: npc.visionRange,
            lastPerceptionTick: 0
        };

        for (const ctx of playerContexts) {
            // Early exit if player is obviously too far away
            if (!NPCSystem.isWithinRangeSquared(npcPos, ctx.stealthState.position, maxRangeSquared)) {
                continue;
            }

            const result = checkStealthDeterministic(
                npcPerceptionState,
                ctx.stealthState
            );

            if (result.visible) {
                detectedPlayerId = ctx.id != null && String(ctx.id).length > 0 ? String(ctx.id) : "unknown_player";
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
