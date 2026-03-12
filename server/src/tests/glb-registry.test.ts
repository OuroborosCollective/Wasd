import { GLBRegistry, GLBLink } from '../modules/asset-registry/GLBRegistry.js';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

async function testGLBRegistry() {
  const registry = new GLBRegistry();

  // Test adding a link
  const testLink: GLBLink = {
    glbPath: '/assets/models/test.glb',
    targetType: 'npc_single',
    targetId: 'test_npc'
  };
  registry.addLink(testLink);

  assert.strictEqual(registry.getModelForTarget('npc_single', 'test_npc'), '/assets/models/test.glb');
  console.log('Test addLink: PASSED');

  // Test updating a link
  const updatedLink: GLBLink = {
    glbPath: '/assets/models/test_updated.glb',
    targetType: 'npc_single',
    targetId: 'test_npc'
  };
  registry.addLink(updatedLink);
  assert.strictEqual(registry.getModelForTarget('npc_single', 'test_npc'), '/assets/models/test_updated.glb');
  console.log('Test updateLink: PASSED');

  // Test removing a link
  registry.removeLink('npc_single', 'test_npc');
  assert.strictEqual(registry.getModelForTarget('npc_single', 'test_npc'), null);
  console.log('Test removeLink: PASSED');

  // Clean up if we actually wrote to a file during tests
  // (GLBRegistry.saveLinks writes to game-data/glb-links.json)
  // In a real environment we might want to mock fs, but here we'll just check it works.

  console.log('All GLBRegistry tests passed!');
}

testGLBRegistry().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
