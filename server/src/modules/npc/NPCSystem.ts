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
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 100; // 10Hz in ms

    public resonanceEngine: TraitResonanceEngine;

    private sovereigntyEngine: GuildSovereigntyEngine;

    private cachedSortedNpcs: NPC[] = [];
    private npcsDirty: boolean = true;
    private playerDataBuffer: Float32Array = new Float32Array(0);

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

        const playerCount = onlinePlayers.length;
        if (this.playerDataBuffer.length !== playerCount * 4) {
            this.playerDataBuffer = new Float32Array(playerCount * 4);
        }

        // Deterministic sort for players to maintain Level-A simulation consistency
        const sortedPlayers = [...onlinePlayers].sort((a, b) =>
            String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
        );

        // Flatten player data once per tick to minimize property access and GC pressure
        for (let i = 0; i < playerCount; i++) {
            const p = sortedPlayers[i];
            const base = i * 4;
            this.playerDataBuffer[base] = Number(p?.position?.x ?? 0);
            this.playerDataBuffer[base + 1] = Number(p?.position?.y ?? 0);
            this.playerDataBuffer[base + 2] = Number(p?.position?.z ?? 0);
            this.playerDataBuffer[base + 3] = Number(p?.stealthValue ?? 0);
        }

        for (const npc of this.cachedSortedNpcs) {
            this.processPerceptionOptimized(npc, sortedPlayers);
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

    private processPerceptionOptimized(npc: NPC, sortedPlayers: any[]): void {
        let detectedPlayerId: string | null = null;
        const nx = npc.position.x;
        const ny = npc.position.y;
        const nz = npc.position.z;
        const ps = npc.phaseShift ?? 0;
        const vr = npc.visionRange;

        const playerCount = sortedPlayers.length;
        for (let i = 0; i < playerCount; i++) {
            const base = i * 4;
            const visible = checkStealthFast(
                nx, ny, nz,
                ps,
                this.playerDataBuffer[base],
                this.playerDataBuffer[base + 1],
                this.playerDataBuffer[base + 2],
                vr,
                this.playerDataBuffer[base + 3]
            );

            if (visible) {
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

    private processPerception(npc: NPC, sortedPlayers: any[]): void {
        let detectedPlayerId: string | null = null;
        const npcPos = NPCSystem.vec3ForPerception(npc.position);

        for (const player of sortedPlayers) {
            const result = checkStealthDeterministic(
                {
                    npcId: npc.id,
                    position: npcPos,
                    phaseShift: npc.phaseShift ?? 0,
                    perceptionRadius: npc.visionRange,
                    lastPerceptionTick: 0
                },
                {
                    playerId: String(player?.id ?? ""),
                    position: NPCSystem.vec3ForPerception(player?.position),
                    stealthLevel: player?.stealthValue ?? 0,
                    isCrouching: false, // Crouching state not yet implemented in PlayerSystem
                    lastVisibleTick: 0
                }
            );

            if (result.visible) {
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
