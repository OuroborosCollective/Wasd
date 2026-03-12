import { HeuristicWorldBrain } from '../modules/brain/HeuristicWorldBrain.js';
import assert from 'node:assert';

function testBrain() {
  const brain = new HeuristicWorldBrain();
  const context = {
    economy: { activeMarkets: 1 },
    politics: {},
    world: { resourceCount: 500, npcCount: 100 },
    npcMemory: []
  };
  const result = brain.analyze(context);
  console.log('Brain Analysis Result:', result);
  assert.strictEqual(result.nodes, 13);
  assert.ok(result.centerValue >= 0 && result.centerValue <= 1);
  console.log('testBrain passed!');
}

testBrain();
