#!/usr/bin/env node
/**
 * autonomous-asset-director.mjs
 *
 * Autonomer Asset-Importer für Areloria / WASD.
 *
 * Ziel:
 * - Keine starren Vorgaben.
 * - Alle Dateien scannen.
 * - Dateityp + Kategorie erkennen.
 * - Bilder optional pixelbasiert analysieren.
 * - Transparente Ränder deterministisch croppen.
 * - Lesbarkeit / Kontrast / Alpha-Fläche bewerten.
 * - Procedural Naming mit stabilem Hash.
 * - Sortiertes Manifest erzeugen.
 *
 * Usage:
 *   node scripts/autonomous-asset-director.mjs --input=./stitch-export
 *   node scripts/autonomous-asset-director.mjs --input=./stitch-export --dry-run
 *   node scripts/autonomous-asset-director.mjs --input=./stitch-export --output=./apps/client-2d/public/2d-assets/auto-assets
 *
 * Optional:
 *   pnpm add -D sharp
 *
 * Ohne sharp:
 * - Datei-Detektion funktioniert.
 * - Bildgröße für PNG wird gelesen.
 * - Cropping wird übersprungen.
 *
 * Mit sharp:
 * - PNG/JPG/WEBP werden analysiert.
 * - Alpha-Crop wird erzeugt.
 * - Kontrast und Lesbarkeit werden berechnet.
 */

import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

function parseArgs(argv) {
  const out = new Map();

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith("--")) continue;

    const raw = arg.slice(2);

    if (raw.includes("=")) {
      const [key, ...rest] = raw.split("=");
      out.set(key, rest.join("="));
      continue;
    }

    const next = argv[i + 1];

    if (next && !next.startsWith("--")) {
      out.set(raw, next);
      i += 1;
    } else {
      out.set(raw, "true");
    }
  }

  return out;
}

const args = parseArgs(process.argv.slice(2));

const publicRoot = resolve(
  args.get("public-root") || join(root, "apps/client-2d/public/2d-assets")
);

const inputDir = resolve(
  args.get("input") ||
  args.get("local-inbox") ||
  "./asset-inbox"
);

const outputDir = resolve(
  args.get("output") ||
  join(publicRoot, "game-assets")
);

const scanExisting = args.get("scan-existing") === "true";
const dryRun = args.get("dry-run") === "true";
const cropEnabled = args.get("crop") !== "false";
const manifestPath = join(outputDir, "manifest.json");
const rootManifestPath = join(publicRoot, "manifest.json");

// -----------------------------------------------------------------------------
// Optional sharp
// -----------------------------------------------------------------------------

let sharp = null;

try {
  const mod = await import("sharp");
  sharp = mod.default;
} catch {
  sharp = null;
}

// -----------------------------------------------------------------------------
// Rules: offen, aber nicht blind
// -----------------------------------------------------------------------------

const EXTENSION_KIND = {
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".svg": "vector",
  ".gif": "image",

  ".json": "metadata",
  ".atlas": "metadata",
  ".xml": "metadata",
  ".txt": "text",
  ".md": "text",

  ".glb": "model3d",
  ".gltf": "model3d",
  ".fbx": "model3d",
  ".obj": "model3d",
  ".mtl": "model3d",
  ".blend": "model3d",

  ".wav": "audio",
  ".mp3": "audio",
  ".ogg": "audio",
  ".flac": "audio",

  ".mp4": "video",
  ".webm": "video",
  ".mov": "video",

  ".ttf": "font",
  ".otf": "font",
  ".woff": "font",
  ".woff2": "font",

  ".zip": "archive",
};

const CATEGORY_HINTS = {
  character: [
    "character",
    "charakter",
    "hero",
    "player",
    "npc",
    "villager",
    "guard",
    "warrior",
    "mage",
    "rogue",
    "samurai",
    "knight",
    "archer",
    "enemy",
    "monster",
    "boss",
  ],

  equipment: [
    "shirt",
    "armor",
    "helmet",
    "boots",
    "gloves",
    "pants",
    "robe",
    "tunic",
    "chainmail",
    "plate",
    "leather",
    "weapon",
    "sword",
    "axe",
    "bow",
    "shield",
    "staff",
  ],

  biome: [
    "biome",
    "terrain",
    "ground",
    "tile",
    "grass",
    "forest",
    "desert",
    "snow",
    "swamp",
    "water",
    "lava",
    "road",
    "stone",
    "sand",
    "dirt",
    "environment",
  ],

  effect: [
    "effect",
    "fx",
    "particle",
    "spell",
    "magic",
    "slash",
    "impact",
    "fire",
    "ice",
    "lightning",
    "explosion",
    "aura",
    "hit",
    "spark",
    "smoke",
  ],

  weather: [
    "weather",
    "rain",
    "snow",
    "storm",
    "fog",
    "mist",
    "cloud",
    "wind",
    "thunder",
    "overlay",
  ],

  ui: [
    "ui",
    "icon",
    "symbol",
    "button",
    "hud",
    "panel",
    "frame",
    "cursor",
    "menu",
    "slot",
    "inventory",
    "paperdoll",
  ],

  building: [
    "building",
    "house",
    "wall",
    "castle",
    "tower",
    "gate",
    "door",
    "bridge",
    "city",
    "village",
    "kingdom",
    "fort",
    "dungeon",
  ],

  audio: [
    "music",
    "sound",
    "sfx",
    "ambient",
    "footstep",
    "attack",
    "hit",
    "ui",
    "click",
    "weather",
    "combat",
  ],

  unknown: [],
};

const CULTURE_HINTS = {
  samurai: ["samurai", "japan", "japanese", "ronin", "shogun", "katana"],
  mongolian: ["mongol", "mongolian", "steppe", "khan"],
  medieval: ["medieval", "castle", "knight", "kingdom", "fantasy"],
  cyber: ["cyber", "neon", "electron", "arc", "tech"],
  forest: ["forest", "druid", "woodland", "nature"],
  desert: ["desert", "sand", "nomad"],
  neutral: [],
};

// -----------------------------------------------------------------------------
// Logging
// -----------------------------------------------------------------------------

function log(message, type = "info") {
  const icon =
    type === "error" ? "❌" :
    type === "warn" ? "⚠️" :
    type === "dry" ? "🧪" :
    type === "scan" ? "🔎" :
    type === "brain" ? "🧠" :
    "✅";

  console.log(`[AutoAssetDirector] ${icon} ${message}`);
}

// -----------------------------------------------------------------------------
// Files
// -----------------------------------------------------------------------------

function listFiles(dir) {
  const out = [];

  if (!existsSync(dir)) return out;

  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    const st = statSync(full);

    if (st.isDirectory()) {
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function ensureDir(dir) {
  if (!dryRun) mkdirSync(dir, { recursive: true });
}

function writeJson(file, payload) {
  if (dryRun) {
    log(`[DRY-RUN] write ${file}`, "dry");
    return;
  }

  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(payload, null, 2) + "\n");
}

function copyFileSafe(src, dst) {
  if (dryRun) {
    log(`[DRY-RUN] copy ${src} -> ${dst}`, "dry");
    return;
  }

  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
}

function sha256File(file) {
  const buf = readFileSync(file);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function shortHash(file) {
  return sha256File(file).slice(0, 12);
}

function slug(input, max = 96) {
  return (
    String(input || "asset")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_{2,}/g, "_")
      .slice(0, max) || "asset"
  );
}

// -----------------------------------------------------------------------------
// Primitive PNG size reader
// -----------------------------------------------------------------------------

function readPngSize(file) {
  try {
    const buf = readFileSync(file);

    const isPng =
      buf.length >= 24 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a;

    if (!isPng) return null;

    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Detection logic
// -----------------------------------------------------------------------------

function tokenizePath(file, baseDir) {
  const rel = relative(baseDir, file);
  const ext = extname(file).toLowerCase();
  const noExt = rel.slice(0, -ext.length);
  const parts = noExt.split(/[\\/_.\-\s]+/g);

  return parts
    .map((p) => slug(p, 48))
    .filter(Boolean);
}

function scoreByHints(tokens, hints) {
  let score = 0;

  for (const token of tokens) {
    for (const hint of hints) {
      if (token === hint) score += 4;
      else if (token.includes(hint)) score += 2;
      else if (hint.includes(token) && token.length >= 4) score += 1;
    }
  }

  return score;
}

function detectCategory(tokens, kind) {
  if (kind === "audio") return "audio";
  if (kind === "font") return "font";
  if (kind === "video") return "video";
  if (kind === "archive") return "archive";
  if (kind === "model3d") {
    const buildingScore = scoreByHints(tokens, CATEGORY_HINTS.building);
    const characterScore = scoreByHints(tokens, CATEGORY_HINTS.character);
    const equipmentScore = scoreByHints(tokens, CATEGORY_HINTS.equipment);

    if (buildingScore >= characterScore && buildingScore >= equipmentScore && buildingScore > 0) return "building";
    if (equipmentScore >= characterScore && equipmentScore > 0) return "equipment";
    if (characterScore > 0) return "character";

    return "model3d";
  }

  let best = "unknown";
  let bestScore = 0;

  for (const [category, hints] of Object.entries(CATEGORY_HINTS)) {
    const score = scoreByHints(tokens, hints);
    if (score > bestScore) {
      best = category;
      bestScore = score;
    }
  }

  if (bestScore === 0 && kind === "image") return "effect";
  if (bestScore === 0 && kind === "metadata") return "metadata";

  return best;
}

function detectCulture(tokens) {
  let best = "neutral";
  let bestScore = 0;

  for (const [culture, hints] of Object.entries(CULTURE_HINTS)) {
    const score = scoreByHints(tokens, hints);
    if (score > bestScore) {
      best = culture;
      bestScore = score;
    }
  }

  return best;
}

function detectKind(file) {
  const ext = extname(file).toLowerCase();
  return EXTENSION_KIND[ext] || "binary";
}

// -----------------------------------------------------------------------------
// Image analysis with optional sharp
// -----------------------------------------------------------------------------

async function analyzeImage(file) {
  const ext = extname(file).toLowerCase();

  const fallback = {
    readable: false,
    tool: sharp ? "sharp" : "none",
    width: null,
    height: null,
    hasAlpha: null,
    cropBox: null,
    alphaCoverage: null,
    contrastScore: null,
    readabilityScore: null,
    warnings: [],
  };

  if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return fallback;
  }

  if (!sharp) {
    if (ext === ".png") {
      const size = readPngSize(file);
      if (size) {
        return {
          ...fallback,
          width: size.width,
          height: size.height,
          warnings: ["sharp_missing_pixel_analysis_disabled"],
        };
      }
    }

    return {
      ...fallback,
      warnings: ["sharp_missing_image_analysis_disabled"],
    };
  }

  try {
    const image = sharp(file, { limitInputPixels: false });
    const meta = await image.metadata();

    const raw = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = raw;
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    let alphaPixels = 0;
    let totalPixels = width * height;

    let luminanceSum = 0;
    let luminanceMin = 255;
    let luminanceMax = 0;
    let visibleSamples = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * channels;

        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const a = data[i + 3] ?? 255;

        if (a > 8) {
          alphaPixels += 1;

          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;

          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          luminanceSum += lum;
          luminanceMin = Math.min(luminanceMin, lum);
          luminanceMax = Math.max(luminanceMax, lum);
          visibleSamples += 1;
        }
      }
    }

    const alphaCoverage = totalPixels > 0 ? alphaPixels / totalPixels : 0;
    const contrastScore = visibleSamples > 0 ? (luminanceMax - luminanceMin) / 255 : 0;

    const cropBox =
      maxX >= minX && maxY >= minY
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : null;

    const areaScore = Math.min(1, Math.max(0, alphaCoverage * 2.2));
    const sizeScore = Math.min(1, Math.max(0, Math.min(width, height) / 256));
    const readabilityScore = Number(
      ((contrastScore * 0.45 + areaScore * 0.35 + sizeScore * 0.2) * 100).toFixed(2)
    );

    const warnings = [];

    if (alphaCoverage < 0.03) warnings.push("very_low_visible_pixel_coverage");
    if (contrastScore < 0.12) warnings.push("low_contrast");
    if (width < 32 || height < 32) warnings.push("very_small_image");
    if (width > 4096 || height > 4096) warnings.push("very_large_image");

    return {
      readable: true,
      tool: "sharp",
      width,
      height,
      format: meta.format,
      hasAlpha: Boolean(meta.hasAlpha),
      cropBox,
      alphaCoverage: Number(alphaCoverage.toFixed(4)),
      contrastScore: Number(contrastScore.toFixed(4)),
      readabilityScore,
      warnings,
    };
  } catch (error) {
    return {
      ...fallback,
      warnings: [`image_analysis_failed:${error.message}`],
    };
  }
}

async function writeCroppedImageIfUseful({ src, dst, analysis }) {
  if (!sharp) return false;
  if (!cropEnabled) return false;
  if (!analysis?.cropBox) return false;

  const { x, y, width, height } = analysis.cropBox;

  if (width <= 0 || height <= 0) return false;

  const originalArea = analysis.width * analysis.height;
  const cropArea = width * height;

  // Nur croppen, wenn wirklich Rand wegfällt.
  if (cropArea / originalArea > 0.96) return false;

  if (dryRun) {
    log(`[DRY-RUN] crop ${src} -> ${dst}`, "dry");
    return true;
  }

  mkdirSync(dirname(dst), { recursive: true });

  await sharp(src)
    .extract({ left: x, top: y, width, height })
    .png()
    .toFile(dst);

  return true;
}

// -----------------------------------------------------------------------------
// Procedural naming
// -----------------------------------------------------------------------------

function createAssetId({ file, baseDir, kind, category, culture, analysis }) {
  const tokens = tokenizePath(file, baseDir);
  const hash = shortHash(file);

  const importantTokens = tokens
    .filter((token) => !["asset", "assets", "image", "png", "export", "stitch"].includes(token))
    .slice(-4);

  const sizePart =
    analysis?.width && analysis?.height
      ? `${analysis.width}x${analysis.height}`
      : "nosize";

  return slug(
    [
      "auto",
      category,
      culture,
      kind,
      ...importantTokens,
      sizePart,
      hash,
    ].join("_"),
    120
  );
}

function getTargetExtension(file, cropped) {
  const ext = extname(file).toLowerCase();

  if (cropped) return ".png";
  if (ext) return ext;

  return ".bin";
}

// -----------------------------------------------------------------------------
// Manifest
// -----------------------------------------------------------------------------

function createManifest() {
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    mode: "autonomous-detection",
    inputDir,
    outputDir,
    sharpEnabled: Boolean(sharp),
    cropEnabled,
    categories: {},
    assets: [],
    stats: {
      totalFiles: 0,
      importedFiles: 0,
      skippedFiles: 0,
      croppedImages: 0,
      warnings: 0,
    },
  };
}

function loadRootManifest() {
  if (!existsSync(rootManifestPath)) {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      basePath: "/2d-assets",
      autoAssets: {},
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(rootManifestPath, "utf8"));
    parsed.version ??= 1;
    parsed.generatedAt = new Date().toISOString();
    parsed.basePath ??= "/2d-assets";
    parsed.autoAssets ??= {};
    return parsed;
  } catch {
    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      basePath: "/2d-assets",
      autoAssets: {},
    };
  }
}

function addToCategoryBucket(manifest, category, entry) {
  manifest.categories[category] ??= {
    count: 0,
    assets: [],
  };

  manifest.categories[category].count += 1;
  manifest.categories[category].assets.push(entry.id);
}

// -----------------------------------------------------------------------------
// Sorting intelligence
// -----------------------------------------------------------------------------

function sortAssets(a, b) {
  const categoryCompare = a.category.localeCompare(b.category);
  if (categoryCompare !== 0) return categoryCompare;

  const kindCompare = a.kind.localeCompare(b.kind);
  if (kindCompare !== 0) return kindCompare;

  const readA = a.analysis?.readabilityScore ?? -1;
  const readB = b.analysis?.readabilityScore ?? -1;

  if (readA !== readB) return readB - readA;

  return a.id.localeCompare(b.id);
}

// -----------------------------------------------------------------------------
// Main import
// -----------------------------------------------------------------------------

async function processFile({ file, baseDir, manifest, rootManifest }) {
  const rel = relative(baseDir, file);
  const ext = extname(file).toLowerCase();
  const kind = detectKind(file);
  const tokens = tokenizePath(file, baseDir);
  const category = detectCategory(tokens, kind);
  const culture = detectCulture(tokens);
  const hash = shortHash(file);
  const sizeBytes = statSync(file).size;

  const analysis = kind === "image" ? await analyzeImage(file) : null;

  const id = createAssetId({
    file,
    baseDir,
    kind,
    category,
    culture,
    analysis,
  });

  const categoryDir = join(outputDir, category);
  const assetDir = join(categoryDir, id);

  const originalName = `${id}${ext || ".bin"}`;
  const originalTarget = join(assetDir, originalName);

  let cropped = false;
  let mainFileName = originalName;
  let mainTarget = originalTarget;

  ensureDir(assetDir);

  if (kind === "image" && sharp && cropEnabled && analysis?.cropBox) {
    const croppedName = `${id}.cropped.png`;
    const croppedTarget = join(assetDir, croppedName);

    cropped = await writeCroppedImageIfUseful({
      src: file,
      dst: croppedTarget,
      analysis,
    });

    if (cropped) {
      mainFileName = croppedName;
      mainTarget = croppedTarget;
      manifest.stats.croppedImages += 1;
    }
  }

  // Original immer sichern.
  copyFileSafe(file, originalTarget);

  const publicBase = "/2d-assets/auto-assets";
  const publicPath = `${publicBase}/${category}/${id}/${mainFileName}`;
  const originalPublicPath = `${publicBase}/${category}/${id}/${originalName}`;

  const entry = {
    id,
    hash,
    kind,
    category,
    culture,
    ext,
    sourcePath: rel,
    sizeBytes,
    src: publicPath,
    originalSrc: originalPublicPath,
    cropped,
    tokens,
    analysis,
    tags: [
      "auto",
      kind,
      category,
      culture,
      cropped ? "cropped" : "original",
      ...(analysis?.warnings?.length ? ["needs-review"] : []),
    ],
    createdAt: new Date().toISOString(),
  };

  if (analysis?.warnings?.length) {
    manifest.stats.warnings += analysis.warnings.length;
  }

  writeJson(join(assetDir, `${id}.meta.json`), entry);

  manifest.assets.push(entry);
  addToCategoryBucket(manifest, category, entry);

  rootManifest.autoAssets[id] = {
    id,
    kind,
    category,
    culture,
    src: publicPath,
    originalSrc: originalPublicPath,
    cropped,
    readabilityScore: analysis?.readabilityScore ?? null,
    tags: entry.tags,
  };

  return entry;
}

async function main() {
  log("Autonomous Asset Director gestartet", "brain");
  log(`Input: ${inputDir}`, "scan");
  log(`Output: ${outputDir}`, "scan");
  log(`Sharp Pixel Skill: ${sharp ? "aktiv" : "nicht installiert"}`, sharp ? "brain" : "warn");
  log(`Dry Run: ${dryRun ? "ja" : "nein"}`);

  if (!existsSync(inputDir)) {
    throw new Error(`Input directory does not exist: ${inputDir}`);
  }

  ensureDir(outputDir);

  const files = listFiles(inputDir);
  const manifest = createManifest();
  const rootManifest = loadRootManifest();

  manifest.stats.totalFiles = files.length;

  log(`Gefundene Dateien im Input: ${files.length}`, "scan");

  for (const file of files) {
    const ext = extname(file).toLowerCase();

    if (!ext) {
      manifest.stats.skippedFiles += 1;
      continue;
    }

    try {
      await processFile({
        file,
        baseDir: inputDir,
        manifest,
        rootManifest,
      });

      manifest.stats.importedFiles += 1;
    } catch (error) {
      manifest.stats.skippedFiles += 1;

      manifest.assets.push({
        id: `failed_${shortHash(file)}`,
        sourcePath: relative(inputDir, file),
        error: error.message,
        failed: true,
      });

      log(`Fehler bei ${file}: ${error.message}`, "warn");
    }
  }

  // Scan existing assets if requested
  if (scanExisting) {
    log("Scanne bestehende 2D-Assets...", "scan");

    const existingRoot = publicRoot;
    const excludeDir = outputDir; // Don't re-import from game-assets itself

    if (existsSync(existingRoot)) {
      const existingFiles = listFiles(existingRoot).filter((f) => {
        // Skip files in outputDir (game-assets)
        return !f.startsWith(excludeDir + "/");
      });

      log(`Gefundene bestehende Dateien: ${existingFiles.length}`, "scan");

      for (const file of existingFiles) {
        const ext = extname(file).toLowerCase();

        if (!ext) continue;

        try {
          await processFile({
            file,
            baseDir: existingRoot,
            manifest,
            rootManifest,
          });

          manifest.stats.importedFiles += 1;
        } catch (error) {
          manifest.stats.skippedFiles += 1;
          log(`Fehler bei ${file}: ${error.message}`, "warn");
        }
      }
    } else {
      log(`Bestehendes Asset-Verzeichnis nicht gefunden: ${existingRoot}`, "warn");
    }
  }

  manifest.assets.sort(sortAssets);

  for (const bucket of Object.values(manifest.categories)) {
    bucket.assets.sort();
  }

  writeJson(manifestPath, manifest);
  writeJson(rootManifestPath, rootManifest);

  log("Import abgeschlossen");
  log(`Importiert: ${manifest.stats.importedFiles}`);
  log(`Übersprungen: ${manifest.stats.skippedFiles}`);
  log(`Cropped Images: ${manifest.stats.croppedImages}`);
  log(`Warnings: ${manifest.stats.warnings}`);
  log(`Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`[AutoAssetDirector] ❌ ${error.stack || error.message}`);
  process.exit(1);
});
