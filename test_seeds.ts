import { SeededARERng } from './server/src/core/determinism/AREDeterminism.js';

const seeds = ['common-seed', 'snow-seed', 'swamp-seed', 'rare'];
seeds.forEach(seed => {
    const rng = new SeededARERng(seed);
    console.log(`Seed: ${seed}, nextFloat: ${rng.nextFloat()}`);
});
