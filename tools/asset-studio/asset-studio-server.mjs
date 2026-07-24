// tools/asset-studio/asset-studio-server.mjs
// Asset Studio — externer GLB/Grafik-Manager für Areloria/Wasd
// Start: node tools/asset-studio/asset-studio-server.mjs
// UI:    http://localhost:4200

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../");

// ─── Konfiguration ──────────────────────────────────────────────────────────
const PORT = 4200;
const REGISTRY_PATH = path.join(ROOT, "game-data/asset-registry.json");
const WORLD_OBJECTS_PATH = path.join(ROOT, "game-data/world/objects.json");
const WORLD_ASSETS_DIR = path.join(ROOT, "world-assets");
const CLIENT_MODELS_DIR = path.join(ROOT, "client/public/assets/models");

// ─── Verzeichnisse sicherstellen ────────────────────────────────────────────
[
  WORLD_ASSETS_DIR,
  path.join(CLIENT_MODELS_DIR, "world-assets"),
  path.join(CLIENT_MODELS_DIR, "characters"),
  path.join(CLIENT_MODELS_DIR, "monsters"),
  path.join(CLIENT_MODELS_DIR, "props"),
  path.join(CLIENT_MODELS_DIR, "environment"),
  path.join(CLIENT_MODELS_DIR, "structures"),
  path.join(CLIENT_MODELS_DIR, "vegetation"),
  path.join(CLIENT_MODELS_DIR, "fx"),
  path.join(CLIENT_MODELS_DIR, "custom"),
  path.join(ROOT, "game-data/world"),
].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// ─── Helper ─────────────────────────────────────────────────────────────────
function safeId(str) {
  return str.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
}

// ─── Asset Registry laden/speichern ─────────────────────────────────────────
function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    const defaultReg = {
      version: 1,
      categories: {
        characters: {
          label: "Charaktere",
          path: "characters",
          spawnType: "npc",
          description: "Spieler, NPCs, Charaktermodelle",
          assets: [],
        },
        monsters: {
          label: "Monster",
          path: "monsters",
          spawnType: "monster",
          description: "Feinde und Kreaturen",
          assets: [],
        },
        props: {
          label: "Props",
          path: "props",
          spawnType: "object",
          description: "Gegenstände, Möbel, Dekorationen",
          assets: [],
        },
        environment: {
          label: "Umgebung",
          path: "environment",
          spawnType: "object",
          description: "Steine, Felsen, Gelände-Elemente",
          assets: [],
        },
        structures: {
          label: "Strukturen",
          path: "structures",
          spawnType: "object",
          description: "Häuser, Türme, Gebäude",
          assets: [],
        },
        vegetation: {
          label: "Vegetation",
          path: "vegetation",
          spawnType: "object",
          description: "Bäume, Büsche, Pflanzen",
          assets: [],
        },
        fx: {
          label: "Effekte",
          path: "fx",
          spawnType: "object",
          description: "Partikeleffekte, Magie-Visuals",
          assets: [],
        },
        custom: {
          label: "Eigene Kategorie",
          path: "custom",
          spawnType: "object",
          description: "Benutzerdefinierte Sets",
          assets: [],
        },
      },
    };
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(defaultReg, null, 2));
    return defaultReg;
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
}

function saveRegistry(reg) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
  broadcastRegistryUpdate();
}

// ─── World Objects laden/speichern ──────────────────────────────────────────
function loadWorldObjects() {
  if (!fs.existsSync(WORLD_OBJECTS_PATH)) {
    fs.writeFileSync(WORLD_OBJECTS_PATH, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(WORLD_OBJECTS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveWorldObjects(objs) {
  fs.writeFileSync(WORLD_OBJECTS_PATH, JSON.stringify(objs, null, 2));
}

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "50mb" }));

// Static: Asset Studio UI
app.use(express.static(path.join(__dirname)));

// Static: GLB-Dateien direkt servieren (für Vorschau)
app.use("/world-assets", express.static(WORLD_ASSETS_DIR));
app.use("/client-models", express.static(CLIENT_MODELS_DIR));

// Multer Upload-Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || "custom";
    const reg = loadRegistry();
    const cat = reg.categories[category];
    const destDir = cat
      ? path.join(CLIENT_MODELS_DIR, cat.path)
      : path.join(CLIENT_MODELS_DIR, "custom");
    fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const custom = req.body.filename;
    const ext = path.extname(file.originalname).toLowerCase();
    const base = custom
      ? custom.replace(/[^a-z0-9_\-]/gi, "_").replace(/\.[^.]+$/, "")
      : path.basename(file.originalname, ext).replace(/[^a-z0-9_\-]/gi, "_");
    cb(null, base + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp", ".ktx2"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 200 * 1024 * 1024 },
});

// ─── API ROUTES ──────────────────────────────────────────────────────────────

// GET /api/registry — alle Kategorien + Assets
app.get("/api/registry", (req, res) => {
  res.json(loadRegistry());
});

// GET /api/categories — nur Kategorien-Übersicht
app.get("/api/categories", (req, res) => {
  const reg = loadRegistry();
  const cats = Object.entries(reg.categories).map(([id, cat]) => ({
    id,
    label: cat.label,
    path: cat.path,
    spawnType: cat.spawnType,
    description: cat.description,
    assetCount: (cat.assets || []).length,
  }));
  res.json(cats);
});

// POST /api/category — neue Kategorie anlegen
app.post("/api/category", (req, res) => {
  const { id, label, path: catPath, spawnType, description } = req.body;
  if (!id || !label || !catPath) {
    return res.status(400).json({ error: "id, label und path erforderlich" });
  }
  const safeIdStr = safeId(id);
  const reg = loadRegistry();
  if (reg.categories[safeIdStr]) {
    return res.status(409).json({ error: "Kategorie existiert bereits" });
  }
  const newCatDir = path.join(CLIENT_MODELS_DIR, catPath);
  fs.mkdirSync(newCatDir, { recursive: true });
  reg.categories[safeIdStr] = {
    label,
    path: catPath,
    spawnType: spawnType || "object",
    description: description || "",
    assets: [],
  };
  saveRegistry(reg);
  res.json({ success: true, id: safeIdStr });
});

// POST /api/upload — GLB oder Grafik hochladen
app.post("/api/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "Keine Datei" });

    const category = req.body.category || "custom";
    const reg = loadRegistry();
    const cat = reg.categories[category];
    if (!cat) return res.status(400).json({ error: "Kategorie nicht gefunden" });

    const assetId = `${safeId(path.basename(req.file.filename, path.extname(req.file.filename)))}_${Date.now()}`;
    const modelUrl = `/assets/models/${cat.path}/${req.file.filename}`;

    const asset = {
      id: assetId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      category,
      modelUrl,
      uploadedAt: new Date().toISOString(),
      size: req.file.size,
      tags: (req.body.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      spawnType: cat.spawnType,
    };

    if (!cat.assets) cat.assets = [];
    cat.assets.push(asset);
    saveRegistry(reg);

    // Auch in world-assets/ kopieren (für sync-world-assets.mjs Kompatibilität)
    const waTarget = path.join(WORLD_ASSETS_DIR, cat.path);
    fs.mkdirSync(waTarget, { recursive: true });
    fs.copyFileSync(req.file.path, path.join(waTarget, req.file.filename));

    res.json({ success: true, asset });
  });
});

// DELETE /api/asset/:category/:assetId — Asset entfernen
app.delete("/api/asset/:category/:assetId", (req, res) => {
  const { category, assetId } = req.params;
  const reg = loadRegistry();
  const cat = reg.categories[category];
  if (!cat) return res.status(404).json({ error: "Kategorie nicht gefunden" });

  const idx = (cat.assets || []).findIndex((a) => a.id === assetId);
  if (idx === -1) return res.status(404).json({ error: "Asset nicht gefunden" });

  const asset = cat.assets[idx];
  // Datei löschen
  const filePath = path.join(CLIENT_MODELS_DIR, cat.path, asset.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  cat.assets.splice(idx, 1);
  saveRegistry(reg);
  res.json({ success: true });
});

// POST /api/deploy — Asset ins Live-Spiel eintragen (world/objects.json + auto-spawn)
app.post("/api/deploy", (req, res) => {
  const { assetId, category, spawnConfig } = req.body;
  const reg = loadRegistry();
  const cat = reg.categories[category];
  if (!cat) return res.status(400).json({ error: "Kategorie nicht gefunden" });

  const asset = (cat.assets || []).find((a) => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset nicht gefunden" });

  const worldObjs = loadWorldObjects();

  // Prüfen ob bereits deployed
  const existing = worldObjs.find((o) => o.assetId === assetId);
  if (existing) {
    return res.status(409).json({ error: "Asset bereits deployed", existing });
  }

  const cfg = spawnConfig || {};
  const spawnEntry = {
    id: `${category}_${safeId(asset.filename.replace(/\.[^.]+$/, ""))}_${Date.now()}`,
    assetId,
    type: cat.spawnType,
    modelUrl: asset.modelUrl,
    category,
    name: cfg.name || asset.filename.replace(/\.[^.]+$/, ""),
    spawnWeight: cfg.spawnWeight ?? 1.0,
    spawnBiomes: cfg.spawnBiomes || ["*"],
    minDistance: cfg.minDistance ?? 5,
    maxDistance: cfg.maxDistance ?? 50,
    scale: cfg.scale ?? 1.0,
    rotateRandom: cfg.rotateRandom ?? true,
    deployedAt: new Date().toISOString(),
    autoSpawn: cfg.autoSpawn ?? true,
    visible: true,
    position: cfg.position || { x: 0, y: 0, z: 0 },
    rotation: cfg.rotation || { x: 0, y: 0, z: 0 },
  };

  worldObjs.push(spawnEntry);
  saveWorldObjects(worldObjs);

  // Registry markieren
  asset.deployed = true;
  asset.deployedAt = new Date().toISOString();
  saveRegistry(reg);

  res.json({ success: true, spawnEntry });
});

// ─── WebSocket Server für Live-Updates ──────────────────────────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server });

function broadcastRegistryUpdate() {
  const data = JSON.stringify({ type: "registry_update" });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Asset Studio Client verbunden");
});

server.listen(PORT, () => {
  console.log(`Asset Studio läuft auf http://localhost:${PORT}`);
});
