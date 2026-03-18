const fs = require('fs');

let file1 = 'client/src/ui/AssetBrainViewer.ts';
let content1 = fs.readFileSync(file1, 'utf8');

content1 = content1.replace(
  'const helper = new THREE.VertexNormalsHelper(mesh, 0.5, 0x00ff00);',
  'const helper = new (THREE as any).VertexNormalsHelper(mesh, 0.5, 0x00ff00);'
);
fs.writeFileSync(file1, content1);

let file2 = 'client/src/ui/characterEditor.ts';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
  'import { Scene, PerspectiveCamera, WebGLRenderer, Color } from "three";',
  'import * as THREE from "three";\nimport { Scene, PerspectiveCamera, WebGLRenderer, Color } from "three";'
);
fs.writeFileSync(file2, content2);
