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
}

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private cachedSortedNpcs: NPC[] = [];
    private npcsDirty = true;
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
        // Optimization: Only re-sort NPCs if the collection has changed
        if (this.npcsDirty) {
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) => {
                const idA = a?.id ?? "";
                const idB = b?.id ?? "";
                return idA < idB ? -1 : (idA > idB ? 1 : 0);
            });
            this.npcsDirty = false;
        }

        // Optimization: Use faster comparison for player sorting
        const sortedPlayers = [...onlinePlayers].sort((a, b) => {
            const idA = String(a?.id ?? "");
            const idB = String(b?.id ?? "");
            return idA < idB ? -1 : (idA > idB ? 1 : 0);
        });

        // Optimization: Pre-process players once per tick to avoid O(N*P) object churn.
        // This converts players into the exact StealthState structure required by checkStealthDeterministic.
        const playerStealthStates = sortedPlayers.map(p => ({
            playerId: p?.id != null && String(p.id).length > 0 ? String(p.id) : "unknown_player",
            position: NPCSystem.vec3ForPerception(p?.position),
            stealthLevel: p?.stealthValue ?? 0,
            isCrouching: false,
            lastVisibleTick: 0
        }));

        for (const npc of this.cachedSortedNpcs) {
            this.processPerception(npc, playerStealthStates);
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

    /**
     * Optimized perception loop:
     * 1. Pre-constructs NPC state once per NPC per tick.
     * 2. Uses raw squared distance for a broadphase check to filter distant players.
     * 3. The broadphase threshold combines the NPC's visionRange and phaseShift to ensure 100% parity.
     * 4. Only calls checkStealthDeterministic for players that pass the broadphase,
     *    eliminating O(N*P) object churn and redundant calculations.
     */
    private processPerception(npc: NPC, playerStealthStates: any[]): void {
        let detectedPlayerId: string | null = null;
        const npcPos = NPCSystem.vec3ForPerception(npc.position);

        // Pre-construct NPC perception state once per tick
        const npcState = {
            npcId: npc.id,
            position: npcPos,
            phaseShift: npc.phaseShift ?? 0,
            perceptionRadius: npc.visionRange,
            lastPerceptionTick: 0
        };

        // Broadphase: Filter out players that are definitively out of range.
        // The visibility formula in PerceptionLogic currently uses a threshold based on phaseShift (base ~225).
        // To ensure 100% parity and future-proof safety, we take the maximum of visionRange^2 and the deterministic threshold,
        // then add a 1.5x safety margin.
        const detThreshold = calculateVisibilityThreshold(npc.phaseShift ?? 0);
        const broadphaseThreshold = Math.max(npc.visionRange * npc.visionRange, detThreshold) * 1.5;

        for (const pState of playerStealthStates) {
            const pPos = pState.position;
            const dx = npcPos.x - pPos.x;
            const dy = npcPos.y - pPos.y;
            const dz = npcPos.z - pPos.z;
            const distSq = dx * dx + dy * dy + dz * dz;

            // Broadphase check to avoid deep logic and object creation for distant entities
            if (distSq <= broadphaseThreshold) {
                // Preserving 100% functional parity with core stealth mechanics
                const result = checkStealthDeterministic(npcState, pState);

                if (result.visible) {
                    detectedPlayerId = pState.playerId;
                    break;
                }
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
