import { checkStealthDeterministic, calculatePhaseShift } from './PerceptionLogic';
import { GuildSovereigntyEngine } from '../guild/GuildSovereigntyEngine';
import { TraitResonanceEngine } from '../resonance/TraitResonanceEngine';
import { EmergentThermalAdapter, type EmergentThermalDecisionResult } from './EmergentThermalAdapter';
import { type AREBrainInput } from './EmergentBrain';
import { type EnergyState } from './ThermalLogic';
import { createEmergenceCollapsePayload, type WorldEmergenceCollapsePayload } from '../world/WorldEmergenceEvent';
import { WorldEventBus } from '../world/WorldEventBus';
import { WorldResonanceAdapter, type LootCapsule, type WorldResonanceResult } from '../world/WorldResonanceAdapter';
import { generateInteractionResponse } from '../dialogue/DialogueDirector';
import {
    pruneNPCGoalsForTick,
    type NPCGoalPruningRuntimeReport,
} from './NPCGoalPruningRuntime.js';

const NPC_CHAT_COOLDOWN_TICKS = 300;
const NPC_CHAT_ROLL_MODULO = 997;
const NPC_CHAT_ROLL_THRESHOLD = 7;
const NPC_CHAT_EVENT_TYPE = 'CHAT_MESSAGE';
const NPC_CHAT_LINES = [
    'Ich halte die Route frei.',
    'Die Wege wirken heute ungewöhnlich ruhig.',
    'Ich beobachte den Takt der Welt.',
    'Hat jemand Bewegung am Rand der Stadt gesehen?',
    'Die Vorräte sollten bald geprüft werden.',
    'Bleibt wachsam, Reisende.',
    'Der Markt braucht bald neue Waren.',
    'Ich habe den letzten Patrouillenpunkt erreicht.',
];

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

function deterministicHash(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
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
    // Tags for categorization (e.g., "playtester", "merchant", "guard")
    tags?: readonly string[];
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
    // ARE Systemic Emergence: NPC Inventory (Conservation Axiom - NPCs use same systems as players)
    inventory?: any;
    activeUtilityDecision?: {
      action: string;
      targetEntity?: string;
      tick: number;
      reason?: string;
    };
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
    private readonly worldEventBus = new WorldEventBus();
    private readonly worldResonanceAdapter = new WorldResonanceAdapter();
    private emergenceEvents: WorldEmergenceCollapsePayload[] = [];
    private resonanceEvents: WorldResonanceResult[] = [];
    private lootCapsules: LootCapsule[] = [];
    private shadowLogs: Record<string, unknown>[] = [];
    private goalPruneReports: NPCGoalPruningRuntimeReport[] = [];
    private lastChatTickByNpc = new Map<string, number>();

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

    public drainWorldChatEvents(): any[] {
        return this.worldEventBus.drain<any>(NPC_CHAT_EVENT_TYPE as any);
    }

    public drainWorldResonanceEvents(): WorldResonanceResult[] {
        const events = this.resonanceEvents;
        this.resonanceEvents = [];
        return events;
    }

    public drainLootCapsules(): LootCapsule[] {
        const capsules = this.lootCapsules;
        this.lootCapsules = [];
        return capsules;
    }

    public drainShadowLogs(): Record<string, unknown>[] {
        const logs = this.shadowLogs;
        this.shadowLogs = [];
        return logs;
    }


    public drainGoalPruneReports(): NPCGoalPruningRuntimeReport[] {
        const reports = this.goalPruneReports;
        this.goalPruneReports = [];
        return reports;
    }


    public handleInteraction(npcId: string, player: any, questDefs: any, worldContext?: { tick?: number; biomeId?: string }): any {
        const npc = this.getNPC(npcId);
        if (!npc) return null;
        
        return generateInteractionResponse(npc, {
          id: player.id,
          name: player.name,
          health: player.health ?? 100,
          maxHealth: player.maxHealth ?? 100,
          gold: player.gold ?? 0,
          equipment: player.equipment ?? {},
        }, {
          tick: Number(worldContext?.tick ?? 0),
          biomeId: worldContext?.biomeId ?? "forest_village",
        }, npc.memory ?? undefined);
    }

    public handleChoice(npcId: string, nodeId: string, choiceId: string, player: any): any {
        const npc = this.getNPC(npcId);
        if (!npc) return null;

        // Process the choice based on choiceId
        let responseText: string;
        let newChoices: Array<{ id: string; text: string }> = [];

        switch (choiceId) {
            case "greet":
                responseText = "Good to see you, traveler.";
                newChoices = [
                    { id: "browse", text: "Browse wares" },
                    { id: "farewell", text: "Farewell" },
                ];
                break;
            case "farewell":
                responseText = "Safe travels, friend.";
                newChoices = [];
                break;
            case "browse":
            case "trade":
                responseText = "Take a look at what I have.";
                newChoices = [
                    { id: "buy", text: "Buy item" },
                    { id: "sell", text: "Sell item" },
                    { id: "farewell", text: "Leave" },
                ];
                break;
            case "buy":
            case "sell":
                responseText = "What would you like to trade?";
                newChoices = [
                    { id: "confirm", text: "Confirm trade" },
                    { id: "cancel", text: "Cancel" },
                ];
                break;
            case "rest":
                responseText = "The room is yours for as long as you need.";
                newChoices = [{ id: "farewell", text: "Leave room" }];
                break;
            case "eat":
                responseText = "Enjoy this meal.";
                newChoices = [{ id: "farewell", text: "Thank you" }];
                break;
            case "gossip":
                responseText = "Word is there's trouble brewing beyond the village walls.";
                newChoices = [
                    { id: "quest", text: "Tell me more" },
                    { id: "farewell", text: "Farewell" },
                ];
                break;
            case "quest":
                responseText = "I hear creatures are stirring near the old ruins.";
                newChoices = [{ id: "accept", text: "I'll investigate" }, { id: "farewell", text: "Not interested" }];
                break;
            case "accept":
                responseText = "Good luck, brave traveler.";
                newChoices = [];
                break;
            case "repair":
            case "forge":
            case "upgrade":
                responseText = "I can work on that for you.";
                newChoices = [
                    { id: "confirm", text: "Proceed" },
                    { id: "farewell", text: "Maybe later" },
                ];
                break;
            case "confirm":
                responseText = "Consider it done.";
                newChoices = [{ id: "farewell", text: "Thank you" }];
                break;
            case "cancel":
            case "decline":
                responseText = "Another time perhaps.";
                newChoices = [{ id: "farewell", text: "Farewell" }];
                break;
            case "heal":
                responseText = "Let me tend to your wounds.";
                newChoices = [{ id: "farewell", text: "Thank you" }];
                break;
            case "bless":
            case "pray":
                responseText = "May the light protect you.";
                newChoices = [{ id: "farewell", text: "Amen" }];
                break;
            case "report":
                responseText = "Report anything unusual to the guard captain.";
                newChoices = [{ id: "farewell", text: "Understood" }];
                break;
            case "advice":
                responseText = "Stay away from the dark forest at night.";
                newChoices = [{ id: "farewell", text: "I will" }];
                break;
            default:
                responseText = "I understand.";
                newChoices = [{ id: "farewell", text: "Farewell" }];
        }

        return {
            source: npc.name || "NPC",
            text: responseText,
            choices: newChoices,
            npcId,
            lastChoice: choiceId,
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
            this.cachedSortedNpcs = Array.from(this.npcs.values()).sort((a, b) => {
                const idA = String(a?.id ?? "");
                const idB = String(b?.id ?? "");
                return idA < idB ? -1 : idA > idB ? 1 : 0;
            });
            this.npcsDirty = false;
        }

        const sortedPlayers = [...onlinePlayers].sort((a, b) => {
            const idA = String(a?.id ?? "");
            const idB = String(b?.id ?? "");
            return idA < idB ? -1 : idA > idB ? 1 : 0;
        });

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
            if (npc.state === 'decomposition') continue;

            // ─────────────────────────────────────────────────────────────────
            // GOAL PRUNING: Heuristic goal list management per tick
            // ═════════════════════════════════════════════════════════════════
            const pruneReport = pruneNPCGoalsForTick(npc, currentTick);
            if (pruneReport && pruneReport.removed > 0) {
                this.goalPruneReports.push(pruneReport);
            }
            // ═════════════════════════════════════════════════════════════════

            this.processEmergentDecision(npc, currentTick, averageDrift, averageThreat, colonyUtility);
            if (npc.state === 'decomposition') continue;
            this.processPerception(npc, playerContexts);
            this.maybeEmitDeterministicChat(npc, currentTick, playerContexts);
            
            // ─────────────────────────────────────────────────────────────────
            // WANDER STATE: Actual position movement
            // ═════════════════════════════════════════════════════════════════
            // 
            // When NPC is in 'wandering' state, we deterministically move them
            // by applying a small position delta based on their facing direction
            // and a deterministic RNG seeded by tick count.
            // 
            // The position change is broadcast via world_snapshot in WorldTick.
            // ═════════════════════════════════════════════════════════════════
            if (npc.state === 'wandering') {
                npc.stateTimer = (npc.stateTimer ?? 0) + 1;
                
                // Only move every few ticks to simulate casual wandering
                if (npc.stateTimer % 10 === 0) {
                    const wanderSeed = `${npc.id}:${currentTick}:wander-move`;
                    const hash = deterministicHash(wanderSeed);
                    
                    // Create movement direction from hash
                    // Hash is used to deterministically pick a direction
                    const moveChance = hash % 100;
                    if (moveChance < 60) { // 60% chance to move
                        const directionIdx = (hash >> 8) % 4;
                        const WANDER_SPEED = 0.05; // Kappa units per tick
                        
                        // Directions: 0=North(-z), 1=East(+x), 2=South(+z), 3=West(-x)
                        switch (directionIdx) {
                            case 0: // North
                                npc.position.z -= WANDER_SPEED;
                                break;
                            case 1: // East
                                npc.position.x += WANDER_SPEED;
                                break;
                            case 2: // South
                                npc.position.z += WANDER_SPEED;
                                break;
                            case 3: // West
                                npc.position.x -= WANDER_SPEED;
                                break;
                        }
                        
                        // Update rotation to face movement direction
                        const rotations = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];
                        npc.rotation = rotations[directionIdx];
                    }
                    
                    // Exit wandering after ~60 seconds (600 ticks)
                    if ((npc.stateTimer ?? 0) > 600) {
                        npc.state = 'observing';
                        npc.stateTimer = 0;
                    }
                }
            }
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

    private maybeEmitDeterministicChat(npc: NPC, currentTick: number, playerContexts: PlayerPerceptionContext[]): void {
        if (playerContexts.length === 0) return;
        if (npc.state === 'decomposition') return;
        const lastChatTick = this.lastChatTickByNpc.get(npc.id) ?? -NPC_CHAT_COOLDOWN_TICKS;
        if (currentTick - lastChatTick < NPC_CHAT_COOLDOWN_TICKS) return;

        const roll = deterministicHash(`${npc.id}:${currentTick}:are-chat`) % NPC_CHAT_ROLL_MODULO;
        if (roll >= NPC_CHAT_ROLL_THRESHOLD) return;

        const lineIndex = deterministicHash(`${npc.id}:${currentTick}:line`) % NPC_CHAT_LINES.length;
        const senderName = String(npc.name || npc.id || 'Wanderer');
        const text = NPC_CHAT_LINES[lineIndex];
        const ts = currentTick * this.TICK_RATE;

        this.lastChatTickByNpc.set(npc.id, currentTick);
        this.worldEventBus.publish({
            eventType: NPC_CHAT_EVENT_TYPE,
            id: `npc_chat_${npc.id}_${currentTick}`,
            tick: currentTick,
            channel: 'global',
            senderId: npc.id,
            senderName,
            text,
            ts,
            position: { x: npc.position.x, y: npc.position.y, z: npc.position.z ?? 0 },
        } as any);
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
            collapseIfExecuted: result.consequence.collapseIfExecuted,
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
            npc.memory.resonanceFields ??= [];
            this.emitDecompositionResonance(npc, result);
            return;
        }

        switch (result.finalAction) {
            case 'WANDER':
                npc.state = 'wandering';
                npc.stateTimer ??= 0;
                break;
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

    private emitDecompositionResonance(npc: NPC, result: EmergentThermalDecisionResult): void {
        const event = createEmergenceCollapsePayload({
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
        });

        this.emergenceEvents.push(event);
        this.worldEventBus.publish(event);

        const resonance = this.worldResonanceAdapter.handleDecomposition(event, this.cachedSortedNpcs);
        this.resonanceEvents.push(resonance);
        this.lootCapsules.push(resonance.lootCapsule);
        this.shadowLogs.push(resonance.shadowLog);
        npc.memory.lastDecompositionResonance = {
            lootCapsuleId: resonance.lootCapsule.id,
            affectedNpcIds: resonance.affectedNpcIds,
            finalKappaHash: event.kappaHash,
            plexityTotal: resonance.lootCapsule.plexityTotal,
        };
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
        const goalPrune = npc.memory?.lastGoalPrune;
        return `${npc.id}:${last?.kappaHash ?? 'memory:0'}:${last?.risk ?? 'NONE'}:${goalPrune?.tick ?? 0}:${goalPrune?.removed ?? 0}`;
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
