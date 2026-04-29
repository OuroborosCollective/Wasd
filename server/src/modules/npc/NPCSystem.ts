import { checkStealthDeterministic } from './PerceptionLogic';

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface NPC {
    id: string;
    position: Vector3;
    rotation: number;
    visionRange: number;
    visionAngle: number;
    targetId: string | null;
    isProcessingAI: boolean;
}

export interface Player {
    id: string;
    position: Vector3;
    stealthValue: number;
}

export class NPCSystem {
    private npcs: Map<string, NPC> = new Map();
    private players: Map<string, Player> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly TICK_RATE = 100; // 10Hz in ms

    constructor() {
        this.startUpdateLoop();
    }

    public addNPC(npc: NPC): void {
        this.npcs.set(npc.id, npc);
    }

    public removeNPC(id: string): void {
        this.npcs.delete(id);
    }

    public updatePlayerState(player: Player): void {
        this.players.set(player.id, player);
    }

    public removePlayer(id: string): void {
        this.players.delete(id);
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
            this.processPerception(npc);
        }
    }

    private processPerception(npc: NPC): void {
        let detectedPlayerId: string | null = null;

        for (const player of this.players.values()) {
            const canSee = checkStealthDeterministic(
                npc.position,
                npc.rotation,
                npc.visionRange,
                npc.visionAngle,
                player.position,
                player.stealthValue
            );

            if (canSee) {
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