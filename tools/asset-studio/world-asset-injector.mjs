// tools/asset-studio/world-asset-injector.mjs
// Watcher für Asset-Registry — Injiziert neue Assets automatisch in das Spiel-System
// Wird von server/src/index.ts importiert oder separat gestartet.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../");
const REGISTRY_PATH = path.join(ROOT, "game-data/asset-registry.json");
const WORLD_OBJECTS_PATH = path.join(ROOT, "game-data/world/objects.json");
const SERVER_ASSETS_PATH = path.join(ROOT, "server/game-data/world/objects.json"); // Falls Server eigene Kopie nutzt

console.log("[AssetInjector] Watcher gestartet auf:", REGISTRY_PATH);

// ─── Watcher ────────────────────────────────────────────────────────────────
if (fs.existsSync(REGISTRY_PATH)) {
  fs.watch(REGISTRY_PATH, (eventType) => {
    if (eventType === "change") {
      console.log("[AssetInjector] Registry-Änderung erkannt, synchronisiere...");
      syncAssets();
    }
  });
} else {
  console.warn("[AssetInjector] Registry existiert noch nicht. Warte auf Erstellung...");
  // Intervall-Check falls Datei noch nicht da
  const checkInterval = setInterval(() => {
    if (fs.existsSync(REGISTRY_PATH)) {
      clearInterval(checkInterval);
      syncAssets();
      fs.watch(REGISTRY_PATH, () => syncAssets());
    }
  }, 5000);
}

function syncAssets() {
  try {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
    const worldObjects = JSON.parse(fs.readFileSync(WORLD_OBJECTS_PATH, "utf-8"));
    
    let changed = false;
    
    // Gehe alle Kategorien durch
    Object.entries(registry.categories).forEach(([catId, cat]) => {
      cat.assets.forEach(asset => {
        // Falls Asset als deployed markiert ist, aber nicht in worldObjects steht:
        if (asset.deployed && !worldObjects.find(o => o.assetId === asset.id)) {
          console.log(`[AssetInjector] Injiziere neues Asset: ${asset.filename} (${catId})`);
          
          const newEntry = {
            id: `${catId}_${asset.id}`,
            assetId: asset.id,
            type: cat.spawnType || "object",
            modelUrl: asset.modelUrl,
            category: catId,
            name: asset.filename.replace(/\.[^.]+$/, ""),
            spawnWeight: 1.0,
            spawnBiomes: ["*"],
            minDistance: 5,
            maxDistance: 50,
            scale: 1.0,
            rotateRandom: true,
            deployedAt: asset.deployedAt || new Date().toISOString(),
            autoSpawn: true,
            visible: true,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
          };
          
          worldObjects.push(newEntry);
          changed = true;
        }
      });
    });
    
    if (changed) {
      fs.writeFileSync(WORLD_OBJECTS_PATH, JSON.stringify(worldObjects, null, 2));
      console.log("[AssetInjector] world/objects.json aktualisiert.");
      
      // Optional: Kopie für den Server-Build-Ordner falls nötig
      if (fs.existsSync(path.dirname(SERVER_ASSETS_PATH))) {
        fs.writeFileSync(SERVER_ASSETS_PATH, JSON.stringify(worldObjects, null, 2));
      }
    }
  } catch (err) {
    console.error("[AssetInjector] Fehler beim Synchronisieren:", err.message);
  }
}

// Initialer Sync
if (fs.existsSync(REGISTRY_PATH) && fs.existsSync(WORLD_OBJECTS_PATH)) {
  syncAssets();
}

export default { syncAssets };
