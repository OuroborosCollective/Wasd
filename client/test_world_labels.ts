import { JSDOM } from 'jsdom';
import * as THREE from 'three';
// stub camera global used by renderer.ts
(global as any).camera = new THREE.PerspectiveCamera();

// we need to import the renderer functions
import { initRenderer, updateWorldState } from './src/engine/renderer.ts';

// setup dom
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
(global as any).window = dom.window;
(global as any).document = dom.window.document;

function logLabels() {
  const labels = Array.from(document.querySelectorAll('[id^="label-"]')).map(el => ({id: el.id, html: el.innerHTML}));
  console.log('world labels:', labels);
}

async function runTest() {
  const canvas = { width: 800, height: 600 } as any as HTMLCanvasElement;
  initRenderer(canvas, 'player1');
  const state = {
    players: [{ id: 'player1', position: { x: 0, y: 0 } }],
    npcs: [{ id: 'npc1', name: 'Goblin', position: {x: 10, y:10}, health: 50, maxHealth: 100 }],
    loot: [{ id: 'loot1', item: { name: 'Sword', type: 'Weapon'}, position: {x: 12, y:12} }]
  };
  updateWorldState(state, 'player1');
  logLabels();
  // simulate damage
  state.npcs[0].health = 25;
  updateWorldState(state, 'player1');
  logLabels();
  // simulate pickup
  state.loot = [];
  updateWorldState(state, 'player1');
  logLabels();
}

runTest().catch(console.error);
