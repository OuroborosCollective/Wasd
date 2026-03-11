import { JSDOM } from 'jsdom';
import * as THREE from 'three';

// provide fake requestAnimationFrame for node environment
(global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);

// stub camera global used by renderer.ts
(global as any).camera = new THREE.PerspectiveCamera();

// we need to import the renderer functions
import { initRenderer, updateWorldState } from './src/engine/renderer.ts';

// setup dom
const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
(global as any).window = dom.window;
(global as any).document = dom.window.document;

function logLabels() {
  // also show tooltip element if present
}

function logTooltip() {
  const t = document.getElementById('interaction-tooltip');
  console.log('tooltip text:', t ? t.textContent : '<none>');
}
  const labels = Array.from(document.querySelectorAll('[id^="label-"]')).map(el => ({id: el.id, html: el.innerHTML}));
  console.log('world labels:', labels);
}

async function runTest() {
  // three.js WebGLRenderer expects a canvas with addEventListener and getContext
  const canvas = {
    width: 800,
    height: 600,
    // no addEventListener so renderer.ts will use DummyRenderer
    getContext: () => ({
      canvas: {}
    })
  } as any as HTMLCanvasElement;
  initRenderer(canvas, 'player1');
  const state = {
    players: [{ id: 'player1', position: { x: 0, y: 0 } }],
    npcs: [{ id: 'npc1', name: 'Goblin', position: {x: 10, y:10}, health: 50, maxHealth: 100 }],
    loot: [{ id: 'loot1', item: { name: 'Sword', type: 'Weapon'}, position: {x: 12, y:12} }]
  };
  updateWorldState(state, 'player1');
  logLabels();
  logTooltip();
  // simulate damage
  state.npcs[0].health = 25;
  updateWorldState(state, 'player1');
  logLabels();
  logTooltip();
  // simulate pickup
  state.loot = [];
  updateWorldState(state, 'player1');
  logLabels();
  logTooltip();

  // interaction priority test: put both loot and npc nearby
  state.loot = [{ id: 'loot2', item: { name: 'Shield', type: 'Armor' }, position: { x: 5, y: 5 } }];
  state.npcs[0].position = { x: 6, y: 6 };
  updateWorldState(state, 'player1');
  logLabels();
  logTooltip();
}

runTest().catch(console.error);
