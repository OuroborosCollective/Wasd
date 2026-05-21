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
        this.addNPC(npc); // addNPC sets npcsDirty = true
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
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) => {
                const idA = a?.id ?? "";
                const idB = b?.id ?? "";
                return idA < idB ? -1 : (idA > idB ? 1 : 0);
            });
            this.npcsDirty = false;
        }

        const sortedPlayers = [...onlinePlayers].sort((a, b) => {
            const idA = String(a?.id ?? "");
            const idB = String(b?.id ?? "");
            return idA < idB ? -1 : (idA > idB ? 1 : 0);
        });

        // Pre-process players into a flat array of primitives for zero-allocation hot loop
        const processedPlayers = sortedPlayers.map(p => ({
            id: String(p?.id ?? ""),
            x: Number.isFinite(Number(p?.position?.x)) ? Number(p.position.x) : 0,
            y: Number.isFinite(Number(p?.position?.y)) ? Number(p.position.y) : 0,
            z: Number.isFinite(Number(p?.position?.z)) ? Number(p.position.z) : 0,
            stealth: Number.isFinite(Number(p?.stealthValue)) ? Number(p.stealthValue) : 0
        }));

        for (const npc of this.cachedSortedNpcs) {
            this.processPerceptionFast(npc, processedPlayers);
        }
    }

    private processPerceptionFast(npc: NPC, processedPlayers: any[]): void {
        let detectedPlayerId: string | null = null;
        const nX = Number.isFinite(Number(npc.position.x)) ? Number(npc.position.x) : 0;
        const nY = Number.isFinite(Number(npc.position.y)) ? Number(npc.position.y) : 0;
        const nZ = Number.isFinite(Number(npc.position.z)) ? Number(npc.position.z) : 0;

        // Calculate dynamic threshold based on NPC vision range and phase shift
        const visionRange = npc.visionRange || 10;
        const clampedPhase = Math.max(-500, Math.min(500, npc.phaseShift ?? 0));
        const threshold = (visionRange * visionRange) * (1.0 + clampedPhase / 1000);

        for (const p of processedPlayers) {
            // Apply player stealth: reduce detection threshold
            // 0 stealth = 100% threshold, 100 stealth = 0% threshold
            const stealthMod = Math.max(0, Math.min(1, 1 - p.stealth / 100));
            if (checkStealthFast(nX, nY, nZ, p.x, p.y, p.z, threshold * stealthMod)) {
                detectedPlayerId = p.id.length > 0 ? p.id : "unknown_player";
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
