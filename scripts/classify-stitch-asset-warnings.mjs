#!/usr/bin/env node
/**
 * classify-stitch-asset-warnings.mjs
 *
 * Deterministic post-processing for AutoAssetDirector manifests.
 * Adds warning categories, severity counts and asset quality metadata without
 * changing imported files.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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

const WARNING_CATALOG = {
  sharp_missing_pixel_analysis_disabled: {
    category: "tooling",
    severity: "medium",
    message: "Sharp is missing; PNG size fallback was used and pixel analysis was skipped.",
  },
  sharp_missing_image_analysis_disabled: {
    category: "tooling",
    severity: "medium",
    message: "Sharp is missing; image analysis and crop detection were skipped.",
  },
  very_low_visible_pixel_coverage: {
    category: "readability",
    severity: "high",
    message: "Visible alpha coverage is very low; asset may be mostly transparent or unreadable.",
  },
  low_contrast: {
    category: "readability",
    severity: "medium",
    message: "Low luminance contrast detected; asset may be hard to read in-game.",
  },
  very_small_image: {
    category: "geometry",
    severity: "medium",
    message: "Image is very small; scaling may reduce readability.",
  },
  very_large_image: {
    category: "geometry",
    severity: "low",
    message: "Image is very large; consider atlas/downscale optimization.",
  },
};

const SEVERITY_ORDER = ["high", "medium", "low", "info"];

function classifyWarning(rawWarning) {
  const warning = String(rawWarning || "unknown_warning");
  const key = warning.includes(":") ? warning.split(":", 1)[0] : warning;
  const known = WARNING_CATALOG[key];

  if (known) {
    return {
      code: key,
      raw: warning,
      category: known.category,
      severity: known.severity,
      message: known.message,
    };
  }

  if (key === "image_analysis_failed") {
    return {
      code: key,
      raw: warning,
      category: "tooling",
      severity: "high",
      message: "Image analysis failed; asset requires inspection.",
    };
  }

  return {
    code: key,
    raw: warning,
    category: "unknown",
    severity: "info",
    message: "Unclassified asset warning.",
  };
}

function emptyWarningSummary() {
  return {
    total: 0,
    byCode: {},
    byCategory: {},
    bySeverity: {
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
  };
}

function inc(target, key, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function sortObjectKeys(input) {
  return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)));
}

function highestSeverity(classifiedWarnings) {
  for (const severity of SEVERITY_ORDER) {
    if (classifiedWarnings.some((warning) => warning.severity === severity)) return severity;
  }
  return "none";
}

function qualityGateForAsset(asset, classifiedWarnings) {
  const readability = asset?.analysis?.readabilityScore;
  const highWarnings = classifiedWarnings.filter((warning) => warning.severity === "high").length;
  const mediumWarnings = classifiedWarnings.filter((warning) => warning.severity === "medium").length;

  if (highWarnings > 0) return "review-required";
  if (typeof readability === "number" && readability < 35) return "review-required";
  if (mediumWarnings > 0) return "needs-polish";
  if (typeof readability === "number" && readability < 55) return "needs-polish";
  return "ready";
}

function postprocessManifest(manifest) {
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const summary = emptyWarningSummary();

  let ready = 0;
  let needsPolish = 0;
  let reviewRequired = 0;
  let cropCandidates = 0;

  const processedAssets = assets.map((asset) => {
    const warnings = Array.isArray(asset?.analysis?.warnings) ? asset.analysis.warnings : [];
    const classifiedWarnings = warnings.map(classifyWarning).sort((a, b) => {
      const severityCompare = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (severityCompare !== 0) return severityCompare;
      return a.code.localeCompare(b.code) || a.raw.localeCompare(b.raw);
    });

    for (const warning of classifiedWarnings) {
      summary.total += 1;
      inc(summary.byCode, warning.code);
      inc(summary.byCategory, warning.category);
      inc(summary.bySeverity, warning.severity);
    }

    const cropBox = asset?.analysis?.cropBox;
    const width = asset?.analysis?.width;
    const height = asset?.analysis?.height;
    const cropCandidate = Boolean(
      cropBox &&
      typeof width === "number" &&
      typeof height === "number" &&
      width > 0 &&
      height > 0 &&
      (cropBox.width * cropBox.height) / (width * height) <= 0.96
    );

    if (cropCandidate) cropCandidates += 1;

    const qualityGate = qualityGateForAsset(asset, classifiedWarnings);
    if (qualityGate === "ready") ready += 1;
    else if (qualityGate === "needs-polish") needsPolish += 1;
    else reviewRequired += 1;

    return {
      ...asset,
      analysis: asset.analysis
        ? {
            ...asset.analysis,
            classifiedWarnings,
            highestWarningSeverity: highestSeverity(classifiedWarnings),
            cropCandidate,
            qualityGate,
          }
        : asset.analysis,
    };
  });

  summary.byCode = sortObjectKeys(summary.byCode);
  summary.byCategory = sortObjectKeys(summary.byCategory);

  const pixelSkill = {
    tool: manifest.sharpEnabled ? "sharp" : "none",
    sharpEnabled: Boolean(manifest.sharpEnabled),
    cropEnabled: Boolean(manifest.cropEnabled),
    croppedImages: Number(manifest?.stats?.croppedImages ?? 0),
    cropCandidates,
  };

  const quality = {
    ready,
    needsPolish,
    reviewRequired,
    warningSummary: summary,
    pixelSkill,
  };

  return {
    ...manifest,
    assets: processedAssets.sort((a, b) => String(a.id).localeCompare(String(b.id))),
    quality,
    stats: {
      ...(manifest.stats ?? {}),
      warnings: summary.total,
      highWarnings: summary.bySeverity.high,
      mediumWarnings: summary.bySeverity.medium,
      lowWarnings: summary.bySeverity.low,
      infoWarnings: summary.bySeverity.info,
      cropCandidates,
    },
  };
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(args.get("manifest") || "apps/client-2d/public/2d-assets/game-assets/manifest.json");
const dryRun = args.get("dry-run") === "true";

if (!existsSync(manifestPath)) {
  throw new Error(`Manifest does not exist: ${manifestPath}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const processed = postprocessManifest(manifest);

if (dryRun) {
  console.log(JSON.stringify(processed.quality, null, 2));
} else {
  writeFileSync(manifestPath, `${JSON.stringify(processed, null, 2)}\n`, "utf8");
}

console.log(
  `[StitchAssetWarnings] manifest=${manifestPath} warnings=${processed.quality.warningSummary.total} high=${processed.quality.warningSummary.bySeverity.high} medium=${processed.quality.warningSummary.bySeverity.medium} cropCandidates=${processed.quality.pixelSkill.cropCandidates} cropped=${processed.quality.pixelSkill.croppedImages} sharp=${processed.quality.pixelSkill.sharpEnabled}`
);
