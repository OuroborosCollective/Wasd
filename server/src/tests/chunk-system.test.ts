import { ChunkSystem } from '../modules/world/ChunkSystem.js';
import assert from 'node:assert';

function testChunkSystemOptimization() {
  const system = new ChunkSystem(64);

  // Create some chunks
  system.getChunk(0, 0);
  system.getChunk(1, 1);
  system.getChunk(2, 2);

  assert.strictEqual(system.getActiveChunks().length, 0, 'Initially no chunks should be active');

  // Activate one chunk
  system.setChunkActive('0:0', true);
  let active = system.getActiveChunks();
  assert.strictEqual(active.length, 1, 'One chunk should be active');
  assert.strictEqual(active[0].id, '0:0');

  // Activate another
  system.setChunkActive('1:1', true);
  active = system.getActiveChunks();
  assert.strictEqual(active.length, 2, 'Two chunks should be active');

  // Deactivate one
  system.setChunkActive('0:0', false);
  active = system.getActiveChunks();
  assert.strictEqual(active.length, 1, 'One chunk should remain active');
  assert.strictEqual(active[0].id, '1:1');

  // Reactivate
  system.setChunkActive('0:0', true);
  assert.strictEqual(system.getActiveChunks().length, 2);

  // Deactivate all
  system.setChunkActive('0:0', false);
  system.setChunkActive('1:1', false);
  assert.strictEqual(system.getActiveChunks().length, 0);

  console.log('testChunkSystemOptimization passed!');
}

testChunkSystemOptimization();
