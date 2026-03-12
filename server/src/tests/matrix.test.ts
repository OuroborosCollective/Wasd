import { MatrixEnergySystem } from '../modules/economy/MatrixEnergySystem.js';
import assert from 'node:assert';

function testMatrix() {
  const system = new MatrixEnergySystem();
  system.add('player1', 100);
  assert.strictEqual(system.getBalance('player1'), 100);
  assert.ok(system.consume('player1', 50));
  assert.strictEqual(system.getBalance('player1'), 50);
  assert.ok(!system.consume('player1', 100));
  system.tick(['player1']);
  assert.strictEqual(system.getBalance('player1'), 51);
  console.log('testMatrix passed!');
}

testMatrix();
