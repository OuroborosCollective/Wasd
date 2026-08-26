import { EventEmitter } from 'events';

const ARE_STATE_COMPILER_TICK_MS = 100;

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

function compareStableString(a: string, b: string): number {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

function stableNpcProjection(npc: NPC): Record<string, unknown> {
    // Note: If fields are added here, you MUST update isNpcMatchingProjected accordingly.
    return {
        id: npc.id,
        profile: npc.profile,
        genealogy: {
            generation: npc.genealogy.generation,
            lineage: [...npc.genealogy.lineage].sort(compareStableString),
            mutations: [...npc.genealogy.mutations].sort(compareStableString),
        },
        stats: {
            integrity: npc.stats.integrity,
            legendSpreadChance: npc.stats.legendSpreadChance,
        },
    };
}

function isNpcMatchingProjected(npc: NPC, projected: Record<string, any>): boolean {
    if (npc.id !== projected.id) return false;
    if (npc.profile !== projected.profile) return false;

    const stats = projected.stats;
    if (npc.stats.integrity !== stats.integrity) return false;
    if (npc.stats.legendSpreadChance !== stats.legendSpreadChance) return false;

    const genealogy = projected.genealogy;
    if (npc.genealogy.generation !== genealogy.generation) return false;

    // Lineage and mutations are arrays, so we check lengths first, then contents.
    // Note: stableNpcProjection sorts these, so we need to compare against the sorted version.
    if (npc.genealogy.lineage.length !== genealogy.lineage.length) return false;
    if (npc.genealogy.mutations.length !== genealogy.mutations.length) return false;

    // For simplicity and correctness (since lineage/mutations can be mutated),
    // if lengths match, we do a shallow check of sorted arrays.
    const sortedLineage = [...npc.genealogy.lineage].sort(compareStableString);
    for (let i = 0; i < sortedLineage.length; i++) {
        if (sortedLineage[i] !== genealogy.lineage[i]) return false;
    }

    const sortedMutations = [...npc.genealogy.mutations].sort(compareStableString);
    for (let i = 0; i < sortedMutations.length; i++) {
        if (sortedMutations[i] !== genealogy.mutations[i]) return false;
    }

    return true;
}

function fnv1a32(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

export class AREStateCompiler extends EventEmitter {
    private lastKnownState: Map<string, Record<string, any>> = new Map();
    private currentVersion: number = 0;
    private mutationSequence: number = 0;
    private isProcessingGenealogy: boolean = false;

    constructor() {
        super();
    }

    public async createDeltaSnapshot(state: WorldState): Promise<DeltaSnapshot> {
        const upserted: NPC[] = [];
        const upsertedProjected: Record<string, unknown>[] = [];
        const deleted: string[] = [];
        const nextState: Map<string, Record<string, any>> = new Map();

        // Bolt: Optimization - Use fast comparison to avoid redundant stringification and projection
        for (const [id, npc] of state.npcs) {
            const lastProjected = this.lastKnownState.get(id);

            if (lastProjected && isNpcMatchingProjected(npc, lastProjected)) {
                nextState.set(id, lastProjected);
            } else {
                const projected = stableNpcProjection(npc);
                nextState.set(id, projected);
                upserted.push(npc);
                upsertedProjected.push(projected);
            }
        }

        // Bolt: Optimization - Iterate keys directly
        for (const id of this.lastKnownState.keys()) {
            if (!state.npcs.has(id)) {
                deleted.push(id);
            }
        }

        // Bolt: Sort only the delta (U log U + D log D), which is typically much smaller than population N.
        upserted.sort((a, b) => compareStableString(a.id, b.id));
        upsertedProjected.sort((a, b) => compareStableString(String(a['id']), String(b['id'])));
        deleted.sort(compareStableString);

        this.lastKnownState = nextState;
        const previousVersion = this.currentVersion;
        this.currentVersion++;

        const snapshot: DeltaSnapshot = {
            timestamp: this.currentVersion * ARE_STATE_COMPILER_TICK_MS,
            baseVersion: previousVersion,
            targetVersion: this.currentVersion,
            integrityHash: this.computeIntegrityHash(upsertedProjected, deleted, previousVersion, this.currentVersion, state.version, state.checksum),
            upserted,
            deleted
        };

        return snapshot;
    }

    private computeIntegrityHash(
        upsertedProjected: Record<string, unknown>[],
        deleted: string[],
        baseVersion: number,
        targetVersion: number,
        worldVersion: number,
        worldChecksum: string,
    ): string {
        const raw = JSON.stringify({
            baseVersion,
            targetVersion,
            worldVersion,
            worldChecksum,
            // Bolt: Optimization - Projections are already pre-calculated and sorted in the delta loop
            upserted: upsertedProjected,
            deleted,
        });
        return `fnv1a32-integrity-${fnv1a32(raw)}`;
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
        const orderedNpcs = [...npcs].sort((a, b) => compareStableString(a.id, b.id));

        for (let i = 0; i < orderedNpcs.length; i += BATCH_SIZE) {
            const batch = orderedNpcs.slice(i, i + BATCH_SIZE);

            for (const npc of batch) {
                if (npc.stats.legendSpreadChance >= threshold && npc.profile !== 'Builder') {
                    this.applyBuilderMutation(npc);
                }
            }

            if (i + BATCH_SIZE < orderedNpcs.length) {
                await this.yieldControl();
            }
        }
    }

    private applyBuilderMutation(npc: NPC): void {
        const oldProfile = npc.profile;
        this.mutationSequence += 1;
        const mutationTick = this.currentVersion + this.mutationSequence;
        npc.profile = 'Builder';
        npc.genealogy.mutations.push(`LEGEND_SPREAD_THRESHOLD_REACHED_${mutationTick}`);

        this.emit('npcEvolved', {
            id: npc.id,
            previousProfile: oldProfile,
            newProfile: 'Builder',
            timestamp: mutationTick * ARE_STATE_COMPILER_TICK_MS
        });
    }

    private yieldControl(): Promise<void> {
        return new Promise(resolve => setImmediate(resolve));
    }
}
