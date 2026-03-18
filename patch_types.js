const fs = require('fs');

// Patch AssetBrainViewer
let file1 = 'client/src/ui/AssetBrainViewer.ts';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace(
  'const helper = new THREE.VertexNormalsHelper(mesh, 0.5, 0x00ff00);',
  '// @ts-ignore: VertexNormalsHelper missing from main THREE typings\n            const helper = new THREE.VertexNormalsHelper(mesh, 0.5, 0x00ff00);'
);

content1 = content1.replace(
  'private clock: THREE.Clock;',
  'private clock!: THREE.Clock;'
);

fs.writeFileSync(file1, content1);


// Patch characterEditor
let file2 = 'client/src/ui/characterEditor.ts';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(
  'import { Scene, PerspectiveCamera, WebGLRenderer, Color } from "three";',
  'import * as THREE from "three";'
);
content2 = content2.replace(
  'import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";',
  'import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";'
);

fs.writeFileSync(file2, content2);
