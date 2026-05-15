import { checkStealthDeterministic } from './PerceptionLogic';
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
}

export interface Player {
    id: string;
    position: Vector3;
    stealthValue: number;
    isOffline?: boolean;
    name?: string;
}

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private players: Map<string, Player> = new Map();
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
    }

    public removeNPC(id: string): boolean {
        return this.npcs.delete(id);
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

    public updatePlayerState(player: Player): void {
        this.players.set(player.id, player);
    }

    public removePlayer(id: string): void {
        this.players.delete(id);
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
        const players = onlinePlayers ?? [];
        if (players.length > 0) {
            for (const npc of this.npcs.values()) {
                let anyClose = false;
                for (const pl of players) {
                    const pos = pl.position ?? { x: 0, y: 0, z: 0 };
                    const dx = npc.position.x - pos.x;
                    const dy = npc.position.y - pos.y;
                    const distSq = dx * dx + dy * dy;
                    if (distSq < 225) {
                        anyClose = true;
                        break;
                    }
                }
                if (anyClose) npc.state = "interacting";
            }
        }
        this.update();
    }

    private startUpdateLoop(): void {
        if (this.updateInterval) return;
        this.updateInterval = setInterval(() => {
            this.update();
        }, this.TICK_RATE);
    }

    public stopUpdateLoop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private update(): void {
        for (const npc of this.npcs.values()) {
            if (npc.state === "wandering" && npc.targetPosition) {
                const tx = npc.targetPosition.x - npc.position.x;
                const ty = npc.targetPosition.y - npc.position.y;
                const dist = Math.hypot(tx, ty);
                if (dist < 0.15) {
                    (npc as { targetPosition?: Vector3 | null }).targetPosition = null;
                } else {
                    const step = Math.min(0.2, dist);
                    npc.position.x += (tx / dist) * step;
                    npc.position.y += (ty / dist) * step;
                }
            }
            this.processPerception(npc);
        }
    }

    private processPerception(npc: NPC): void {
        let detectedPlayerId: string | null = null;

        for (const player of this.players.values()) {
            const result = checkStealthDeterministic(
                npc as any,
                player as any
            );

            if (result.visible) {
                detectedPlayerId = player.id;
                break; 
            }
        }

        if (detectedPlayerId) {
            if (npc.targetId !== detectedPlayerId) {
                npc.targetId = detectedPlayerId;
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

    private getDistance(pos1: Vector3, pos2: Vector3): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
