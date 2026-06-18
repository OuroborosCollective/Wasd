import { AREStateCompiler, type NPC, type WorldState } from '../logic/AREStateCompiler';
import { performance } from 'perf_hooks';

function createMockNpc(id: string): NPC {
    return {
        id,
        profile: 'Citizen',
        genealogy: {
            lineage: ['origin', 'ancestor-1', 'ancestor-2'],
            generation: 3,
            mutations: ['MUT-1', 'MUT-2'],
        },
        stats: {
            legendSpreadChance: 0.1,
            integrity: 1.0,
        },
    };
}

async function runBenchmark() {
    const compiler = new AREStateCompiler();
    const npcCount = 1000;
    const iterations = 100;

    const npcs = new Map<string, NPC>();
    for (let i = 0; i < npcCount; i++) {
        const id = `npc-${i.toString().padStart(4, '0')}`;
        npcs.set(id, createMockNpc(id));
    }

    const state: WorldState = {
        npcs,
        version: 1,
        checksum: 'initial-checksum',
    };

    console.log(`Starting benchmark with ${npcCount} NPCs, ${iterations} iterations...`);

    // Warmup
    await compiler.createDeltaSnapshot(state);

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        // Mutate 5 NPCs per iteration to simulate some activity
        for (let j = 0; j < 5; j++) {
            const targetIndex = (i * 5 + j) % npcCount;
            const targetId = `npc-${targetIndex.toString().padStart(4, '0')}`;
            const npc = npcs.get(targetId)!;
            npc.stats.integrity = (i + j) / (iterations + 5);
        }

        await compiler.createDeltaSnapshot(state);
    }
    const end = performance.now();

    const average = (end - start) / iterations;
    console.log(`Benchmark finished.`);
    console.log(`Total time: ${(end - start).toFixed(2)}ms`);
    console.log(`Average time per snapshot: ${average.toFixed(4)}ms`);
}

runBenchmark().catch(console.error);
