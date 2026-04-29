import { EventEmitter } from 'events';

export interface NPC {
    id: string;
    profile: string;
    genealogy: {
        lineage: string[];
        generation: number;
        mutations: string[];
    };
    stats: {
        legendSpreadChance: number;
        integrity: number;
    };
}

export interface WorldState {
    npcs: Map<string, NPC>;
    version: number;
    checksum: string;
}

export interface DeltaSnapshot {
    timestamp: number;
    baseVersion: number;
    targetVersion: number;
    integrityHash: string;
    upserted: NPC[];
    deleted: string[];
}

export class AREStateCompiler extends EventEmitter {
    private lastKnownState: Map<string, string> = new Map();
    private currentVersion: number = 0;
    private isProcessingGenealogy: boolean = false;

    constructor() {
        super();
    }

    public async createDeltaSnapshot(state: WorldState): Promise<DeltaSnapshot> {
        const upserted: NPC[] = [];
        const deleted: string[] = [];
        const currentSerializedState: Map<string, string> = new Map();

        for (const [id, npc] of state.npcs) {
            const serialized = JSON.stringify(npc);
            currentSerializedState.set(id, serialized);

            if (this.lastKnownState.get(id) !== serialized) {
                upserted.push(npc);
            }
        }

        for (const id of this.lastKnownState.keys()) {
            if (!state.npcs.has(id)) {
                deleted.push(id);
            }
        }

        this.lastKnownState = currentSerializedState;
        const previousVersion = this.currentVersion;
        this.currentVersion++;

        const snapshot: DeltaSnapshot = {
            timestamp: Date.now(),
            baseVersion: previousVersion,
            targetVersion: this.currentVersion,
            integrityHash: this.computeIntegrityHash(upserted, deleted),
            upserted,
            deleted
        };

        return snapshot;
    }

    private computeIntegrityHash(upserted: NPC[], deleted: string[]): string {
        const raw = JSON.stringify({ u: upserted.length, d: deleted.length, t: Date.now() });
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return `sha256-integrity-${hash.toString(16)}`;
    }

    public triggerGenealogyUpdate(npcs: NPC[], threshold: number): void {
        if (this.isProcessingGenealogy) return;

        setImmediate(async () => {
            this.isProcessingGenealogy = true;
            try {
                await this.processGenealogyShift(npcs, threshold);
            } catch (error) {
                this.emit('error', error);
            } finally {
                this.isProcessingGenealogy = false;
            }
        });
    }

    private async processGenealogyShift(npcs: NPC[], threshold: number): Promise<void> {
        const BATCH_SIZE = 100;
        
        for (let i = 0; i < npcs.length; i += BATCH_SIZE) {
            const batch = npcs.slice(i, i + BATCH_SIZE);
            
            for (const npc of batch) {
                if (npc.stats.legendSpreadChance >= threshold && npc.profile !== 'Builder') {
                    this.applyBuilderMutation(npc);
                }
            }

            if (i + BATCH_SIZE < npcs.length) {
                await this.yieldControl();
            }
        }
    }

    private applyBuilderMutation(npc: NPC): void {
        const oldProfile = npc.profile;
        npc.profile = 'Builder';
        npc.genealogy.mutations.push(`LEGEND_SPREAD_THRESHOLD_REACHED_${Date.now()}`);
        
        this.emit('npcEvolved', {
            id: npc.id,
            previousProfile: oldProfile,
            newProfile: 'Builder',
            timestamp: Date.now()
        });
    }

    private yieldControl(): Promise<void> {
        return new Promise(resolve => setImmediate(resolve));
    }
}