import { checkStealthDeterministic, calculatePhaseShift } from './PerceptionLogic';
import { GuildSovereigntyEngine } from '../guild/GuildSovereigntyEngine';
import { TraitResonanceEngine } from '../resonance/TraitResonanceEngine';
import { EmergentThermalAdapter, type EmergentThermalDecisionResult } from './EmergentThermalAdapter';
import { type AREBrainInput } from './EmergentBrain';
import { type EnergyState } from './ThermalLogic';
import { createEmergenceCollapsePayload, type WorldEmergenceCollapsePayload } from '../world/WorldEmergenceEvent';

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
    energyState?: EnergyState;
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

type PlayerPerceptionContext = {
    id: string;
    position: Vector3;
    stealthLevel: number;
    drift: number;
    threat: number;
};

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 100; // 10Hz in ms
    private readonly thermalAdapter = new EmergentThermalAdapter();
    private emergenceEvents: WorldEmergenceCollapsePayload[] = [];

    public resonanceEngine: TraitResonanceEngine;

    private sovereigntyEngine: GuildSovereigntyEngine;
    private cachedSortedNpcs: NPC[] = [];
    private npcsDirty = true;

    constructor() {
        // Initialize stub dependencies
        this.sovereigntyEngine = new GuildSovereigntyEngine();
        this.resonanceEngine = new TraitResonanceEngine(this.sovereigntyEngine);
    }

    public addNPC(npc: NPC): void {
        npc.traits ??= deterministicNpcTraits(npc.id);
        npc.energyState ??= NPCSystem.initialEnergyState(0);
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
            energyState: NPCSystem.initialEnergyState(0),
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

    public drainEmergenceEvents(): WorldEmergenceCollapsePayload[] {
        const events = this.emergenceEvents;
        this.emergenceEvents = [];
        return events;
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
        this.update(onlinePlayers, worldTime);
    }

    private update(onlinePlayers: any[], worldTime: number): void {
        if (this.npcsDirty) {
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) =>
                String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
            );
            this.npcsDirty = false;
        }

        const sortedPlayers = [...onlinePlayers].sort((a, b) =>
            String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
        );

        const playerContexts: PlayerPerceptionContext[] = sortedPlayers.map((player) => ({
            id: player?.id != null && String(player.id).length > 0 ? String(player.id) : "unknown_player",
            position: NPCSystem.vec3ForPerception(player?.position),
            stealthLevel: Number.isFinite(Number(player?.stealthValue)) ? Number(player.stealthValue) : 0,
            drift: NPCSystem.unit(player?.deltaDrift ?? player?.drift ?? player?.are?.deltaDrift ?? 0),
            threat: NPCSystem.unit(player?.threat ?? player?.combatThreat ?? 0),
        }));

        const currentTick = Math.max(0, Math.trunc(Number.isFinite(Number(worldTime)) ? Number(worldTime) : 0));
        const colonyUtility = NPCSystem.colonyUtilityFromPlayers(playerContexts);
        const averageDrift = NPCSystem.average(playerContexts.map((player) => player.drift));
        const averageThreat = NPCSystem.average(playerContexts.map((player) => player.threat));

        for (const npc of this.cachedSortedNpcs) {
            this.processEmergentDecision(npc, currentTick, averageDrift, averageThreat, colonyUtility);
            if (npc.state === 'decomposition') continue;
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

    /** Zero-allocation broad phase for avoiding full stealth checks on obviously distant players. */
    private static isWithinRangeSquared(a: Vector3, b: Vector3, range: number): boolean {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        return dx * dx + dy * dy + dz * dz <= range * range;
    }

    private processPerception(npc: NPC, playerContexts: PlayerPerceptionContext[]): void {
        let detectedPlayerId: string | null = null;
        const npcPos = NPCSystem.vec3ForPerception(npc.position);
        const visionRange = Number.isFinite(Number(npc.visionRange)) ? Number(npc.visionRange) : 10;
        const broadPhaseRange = visionRange * 1.5;

        for (const player of playerContexts) {
            if (!NPCSystem.isWithinRangeSquared(npcPos, player.position, broadPhaseRange)) {
                continue;
            }

            const result = checkStealthDeterministic(
                {
                    npcId: npc.id,
                    position: npcPos,
                    phaseShift: npc.phaseShift ?? 0,
                    perceptionRadius: visionRange,
                    lastPerceptionTick: 0
                },
                {
                    playerId: player.id,
                    position: player.position,
                    stealthLevel: player.stealthLevel,
                    isCrouching: false, // Crouching state not yet implemented in PlayerSystem
                    lastVisibleTick: 0
                }
            );

            if (result.visible) {
                detectedPlayerId = player.id;
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

    private processEmergentDecision(npc: NPC, currentTick: number, playerDeltaDrift: number, playerThreat: number, colonyUtility: number): void {
        npc.energyState ??= NPCSystem.initialEnergyState(currentTick);
        const brainInput = this.buildBrainInput(npc, currentTick, playerDeltaDrift, playerThreat, colonyUtility);
        const result = this.thermalAdapter.process({ brainInput, energyState: npc.energyState, currentTick });
        this.commitThermalDecision(npc, result);
    }

    private buildBrainInput(npc: NPC, currentTick: number, playerDeltaDrift: number, playerThreat: number, colonyUtility: number): AREBrainInput {
        const traits = npc.traits ?? deterministicNpcTraits(npc.id);
        return {
            npcId: npc.id,
            factionId: String(npc.faction ?? 'neutral'),
            traits,
            energy: (npc.energyState?.currentEnergy ?? 1000) / Math.max(1, npc.energyState?.maxEnergy ?? 1000),
            memoryHash: NPCSystem.memoryHash(npc),
            localStateHash: NPCSystem.localStateHash(npc),
            playerDeltaDrift,
            playerThreat,
            colonyUtility,
            resourcePressure: NPCSystem.unit(1 - ((npc.energyState?.currentEnergy ?? 1000) / Math.max(1, npc.energyState?.maxEnergy ?? 1000))),
            tick: currentTick,
        };
    }

    private commitThermalDecision(npc: NPC, result: EmergentThermalDecisionResult): void {
        npc.energyState = result.energyState;
        npc.memory ??= {};
        npc.memory.lastThermalDecision = {
            tick: result.energyState.lastUpdatedTick,
            action: result.finalAction,
            thermalStatus: result.thermalStatus,
            risk: result.consequence.risk,
            collapseRisk: result.consequence.collapseRisk,
            survivalBias: result.consequence.survivalBias,
            energyBefore: result.energyStats.before,
            energyAfterDecay: result.energyStats.afterDecay,
            energyAfterAction: result.energyStats.afterAction,
            reason: result.reason,
            kappaHash: result.brainDecision?.kappaHash ?? null,
        };

        if (result.finalAction === 'DECOMPOSITION' || result.decomposition) {
            npc.state = 'decomposition';
            npc.targetId = null;
            npc.isProcessingAI = false;
            npc.memory.resonanceFields = [];
            this.emergenceEvents.push(createEmergenceCollapsePayload({
                npcId: npc.id,
                factionId: npc.faction ?? 'neutral',
                position: npc.position,
                tick: result.energyState.lastUpdatedTick,
                reason: result.reason,
                risk: result.consequence.risk,
                sourceAction: result.finalAction,
                energyBefore: result.energyStats.before,
                energyAfterDecay: result.energyStats.afterDecay,
                energyAfterAction: result.energyStats.afterAction,
                kappaHash: result.brainDecision?.kappaHash ?? null,
            }));
            return;
        }

        switch (result.finalAction) {
            case 'HARVEST_RESOURCE':
                npc.state = 'harvesting';
                break;
            case 'WITHDRAW':
                npc.state = 'withdrawing';
                break;
            case 'DEFEND_COLONY':
                npc.state = 'defending';
                break;
            case 'ANCHOR_BUFF':
                npc.state = 'supporting';
                break;
            case 'WARN_FACTION':
                npc.state = 'warning';
                break;
            case 'OBSERVE':
            default:
                npc.state = 'observing';
                break;
        }
    }

    private static initialEnergyState(tick: number): EnergyState {
        return { currentEnergy: 1000, maxEnergy: 1000, decayRate: 1, lastUpdatedTick: Math.max(0, Math.trunc(tick)) };
    }

    private static unit(value: unknown): number {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(1, n));
    }

    private static average(values: number[]): number {
        if (values.length === 0) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    private static colonyUtilityFromPlayers(players: PlayerPerceptionContext[]): number {
        if (players.length === 0) return 0.5;
        return Math.max(0, Math.min(1, 1 - NPCSystem.average(players.map((player) => player.threat))));
    }

    private static memoryHash(npc: NPC): string {
        const last = npc.memory?.lastThermalDecision;
        return `${npc.id}:${last?.kappaHash ?? 'memory:0'}:${last?.risk ?? 'NONE'}`;
    }

    private static localStateHash(npc: NPC): string {
        const pos = NPCSystem.vec3ForPerception(npc.position);
        return `${npc.state ?? 'idle'}:${Math.trunc(pos.x * 10)}:${Math.trunc(pos.y * 10)}:${Math.trunc(pos.z * 10)}`;
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
