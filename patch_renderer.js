const fs = require('fs');
let code = fs.readFileSync('client/src/engine/renderer.ts', 'utf8');

// 1. Add highlightRing variable
code = code.replace(
  'let waterMesh: THREE.Mesh | null = null;',
  'let waterMesh: THREE.Mesh | null = null;\nlet highlightRing: THREE.Mesh | null = null;\nlet highlightPulse = 0;'
);

// 2. Initialize highlightRing in buildScene
code = code.replace(
  '  // Trees (fewer on mobile)',
  `  // Highlight Ring
  const ringGeo = new THREE.RingGeometry(0.8, 1.1, 32);
  ringGeo.rotateX(-Math.PI / 2);
  highlightRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
  highlightRing.visible = false;
  s.add(highlightRing);

  // Trees (fewer on mobile)`
);

// 3. Animate highlight ring pulsing and rotation
code = code.replace(
  `    // Water animation
    if (waterMesh) {
      waterMesh.position.y = -3 + Math.sin(elapsed * 0.5) * 0.2;
    }`,
  `    // Water animation
    if (waterMesh) {
      waterMesh.position.y = -3 + Math.sin(elapsed * 0.5) * 0.2;
    }

    if (highlightRing && highlightRing.visible) {
      highlightPulse += delta * 3;
      highlightRing.rotation.z += delta; // Rotates horizontally because X is rotated -PI/2
      const scale = 1 + Math.sin(highlightPulse) * 0.1;
      highlightRing.scale.set(scale, scale, scale);
      (highlightRing.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(highlightPulse * 2) * 0.3;
    }`
);

// 4. Update ring position and visibility
code = code.replace(
  `    if (nearby) {
      const hint = isMobile() ? "Tap [E]" : "[E]";
      showTooltip(\`\${hint} \${nearby.type === "loot" ? "Pick up" : "Talk to"} \${nearby.name || nearby.id}\`);
    } else {
      hideTooltip();
    }`,
  `    if (nearby) {
      const hint = isMobile() ? "Tap [E]" : "[E]";
      showTooltip(\`\${hint} \${nearby.type === "loot" ? "Pick up" : "Talk to"} \${nearby.name || nearby.id}\`);

      if (highlightRing) {
        highlightRing.visible = true;
        highlightRing.position.set(nearby.position.x, getTerrainHeight(nearby.position.x, nearby.position.y) + 0.1, nearby.position.y);
        (highlightRing.material as THREE.MeshBasicMaterial).color.setHex(nearby.type === "loot" ? 0xffd700 : 0x00ff88);
      }
    } else {
      hideTooltip();
      if (highlightRing) highlightRing.visible = false;
    }`
);

fs.writeFileSync('client/src/engine/renderer.ts', code);
