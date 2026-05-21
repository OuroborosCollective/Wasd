import { checkStealthDeterministic, calculatePhaseShift, checkStealthFast, calculateVisibilityThreshold } from './PerceptionLogic';
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
    perceptionThreshold?: number;
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
        npc.perceptionThreshold = calculateVisibilityThreshold(npc.phaseShift ?? 0);
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
        if (this.npcsDirty) {
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) =>
                a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)
            );
            this.npcsDirty = false;
        }

        const sortedPlayers = [...onlinePlayers].sort((a, b) =>
            a.id < b.id ? -1 : (a.id > b.id ? 1 : 0)
        );

        // Pre-flatten player data to avoid repeated property access and Number() conversions
        const numPlayers = sortedPlayers.length;
        const pX = new Float64Array(numPlayers);
        const pY = new Float64Array(numPlayers);
        const pZ = new Float64Array(numPlayers);
        const pIds = new Array<string>(numPlayers);
        const pStealth = new Float64Array(numPlayers);

        for (let i = 0; i < numPlayers; i++) {
            const p = sortedPlayers[i];
            pX[i] = Number(p?.position?.x ?? 0);
            pY[i] = Number(p?.position?.y ?? 0);
            pZ[i] = Number(p?.position?.z ?? 0);
            pIds[i] = String(p?.id ?? "unknown");
            pStealth[i] = Number(p?.stealthValue ?? 0);
        }

        for (let i = 0; i < this.cachedSortedNpcs.length; i++) {
            this.processPerceptionOptimized(this.cachedSortedNpcs[i], pX, pY, pZ, pIds, pStealth);
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

    private processPerceptionOptimized(
        npc: NPC,
        pX: Float64Array,
        pY: Float64Array,
        pZ: Float64Array,
        pIds: string[],
        pStealth: Float64Array
    ): void {
        let detectedPlayerId: string | null = null;
        const nx = npc.position.x;
        const ny = npc.position.y;
        const nz = npc.position.z;
        const ps = npc.phaseShift ?? 0;
        const vr = npc.visionRange;

        for (let i = 0; i < pIds.length; i++) {
            if (checkStealthFast(nx, ny, nz, ps, vr, pX[i], pY[i], pZ[i], pStealth[i])) {
                detectedPlayerId = pIds[i];
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
