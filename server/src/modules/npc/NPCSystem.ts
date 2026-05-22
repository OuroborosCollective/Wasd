import { checkStealthDeterministic, calculatePhaseShift, checkStealthFast } from './PerceptionLogic';
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
    private npcsDirty: boolean = true;

    // Reuse buffers to reduce GC pressure
    private playerPositionsBuffer: Float32Array = new Float32Array(0);

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

        // Optimization: Flatten player positions into TypedArrays
        // This avoids repeated property access and object lookups in the inner NPC loop.
        const playerCount = sortedPlayers.length;

        // Reallocate buffer only if needed
        if (this.playerPositionsBuffer.length < playerCount * 3) {
            this.playerPositionsBuffer = new Float32Array(playerCount * 3);
        }

        for (let i = 0; i < playerCount; i++) {
            const p = sortedPlayers[i];
            const pos = p?.position;
            this.playerPositionsBuffer[i * 3] = Number.isFinite(Number(pos?.x)) ? Number(pos.x) : 0;
            this.playerPositionsBuffer[i * 3 + 1] = Number.isFinite(Number(pos?.y)) ? Number(pos.y) : 0;
            this.playerPositionsBuffer[i * 3 + 2] = Number.isFinite(Number(pos?.z)) ? Number(pos.z) : 0;
        }

        for (const npc of this.cachedSortedNpcs) {
            this.processPerceptionOptimized(npc, sortedPlayers, this.playerPositionsBuffer);
        }
    }

    /** Optimized perception loop using flattened player data and fast distance checks. */
    private processPerceptionOptimized(
        npc: NPC,
        sortedPlayers: any[],
        playerPositions: Float32Array
    ): void {
        let detectedPlayerId: string | null = null;
        const npcX = Number.isFinite(Number(npc.position?.x)) ? Number(npc.position.x) : 0;
        const npcY = Number.isFinite(Number(npc.position?.y)) ? Number(npc.position.y) : 0;
        const npcZ = Number.isFinite(Number(npc.position?.z)) ? Number(npc.position.z) : 0;
        const npcPhase = npc.phaseShift ?? 0;

        const playerCount = sortedPlayers.length;
        for (let i = 0; i < playerCount; i++) {
            const isVisible = checkStealthFast(
                npcX, npcY, npcZ,
                npcPhase,
                playerPositions[i * 3], playerPositions[i * 3 + 1], playerPositions[i * 3 + 2]
            );

            if (isVisible) {
                const player = sortedPlayers[i];
                detectedPlayerId = player?.id != null && String(player.id).length > 0 ? String(player.id) : "unknown_player";
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
