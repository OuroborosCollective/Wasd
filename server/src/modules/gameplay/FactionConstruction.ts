// @ARE-GUARD-EXEMPT: non-sim module
import { EventEmitter } from 'events';

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface Entity {
    id: string;
    position: Vector3;
    factionId: string;
    roles: string[];
    fusionAdaptiveGlbPath?: string;
}

interface ConstructionContract {
    id: string;
    position: Vector3;
    isClaimed: boolean;
    claimedBy?: string;
}

export class FactionConstruction extends EventEmitter {
    private npcs: Map<string, Entity> = new Map();
    private contracts: Map<string, ConstructionContract> = new Map();
    private updateInterval: NodeJS.Timeout | null = null;
    private readonly SCAN_RADIUS = 40;

    private readonly toolMapping: Record<string, string> = {
        'Builder': 'hammer',
        'Engineer': 'wrench'
    };

    constructor() {
        super();
        this.startUpdateLoop();
    }

    public registerNpc(npc: Entity): void {
        this.npcs.set(npc.id, npc);
    }

    public registerContract(contract: ConstructionContract): void {
        this.contracts.set(contract.id, contract);
    }

    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            this.scanForContracts();
        }, 1000);
    }

    private scanForContracts(): void {
        this.npcs.forEach(npc => {
            if (npc.fusionAdaptiveGlbPath) return;

            this.contracts.forEach(contract => {
                if (contract.isClaimed) return;

                const distance = this.calculateDistance(npc.position, contract.position);
                if (distance <= this.SCAN_RADIUS) {
                    this.onClaimContract(npc.id, contract.id);
                }
            });
        });
    }

    public onClaimContract(npcId: string, contractId: string): boolean {
        const npc = this.npcs.get(npcId);
        const contract = this.contracts.get(contractId);

        if (!npc || !contract || contract.isClaimed) {
            return false;
        }

        const validRole = npc.roles.find(role => role === 'Builder' || role === 'Engineer');

        if (!validRole) {
            return false;
        }

        contract.isClaimed = true;
        contract.claimedBy = npcId;

        const toolName = this.toolMapping[validRole];
        npc.fusionAdaptiveGlbPath = `/assets/tools/faction${npc.factionId}_${toolName}.glb`;

        this.emit('contractClaimed', { npcId, contractId, assetPath: npc.fusionAdaptiveGlbPath });
        return true;
    }

    private calculateDistance(pos1: Vector3, pos2: Vector3): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    public stop(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}