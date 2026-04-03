import fs from "node:fs";
import path from "node:path";
import { getServerPublicModelsDir } from "./adminGlbPathCheck.js";

export type GlbGalleryItem = {
  relativePath: string;
  /** URL path starting with /assets/models/ */
  url: string;
  name: string;
  isDirectory: boolean;
  sizeBytes?: number;
};

/**
 * Recursively list .glb/.gltf files and directories under client/public/assets/models.
 */
export function scanGlbGalleryTree(): { modelsRoot: string; items: GlbGalleryItem[] } {
  const modelsRoot = getServerPublicModelsDir();
  const items: GlbGalleryItem[] = [];

  function walk(relDir: string) {
    const absDir = path.join(modelsRoot, relDir);
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) return;
    const names = fs.readdirSync(absDir).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    for (const name of names) {
      if (name.startsWith(".")) continue;
      const rel = relDir ? path.join(relDir, name) : name;
      const abs = path.join(modelsRoot, rel);
      const st = fs.statSync(abs);
      if (st.isDirectory()) {
        items.push({
          relativePath: rel.replace(/\\/g, "/"),
          url: "/assets/models/" + rel.replace(/\\/g, "/"),
          name,
          isDirectory: true,
        });
        walk(rel);
      } else if (st.isFile()) {
        const lower = name.toLowerCase();
        if (!lower.endsWith(".glb") && !lower.endsWith(".gltf")) continue;
        items.push({
          relativePath: rel.replace(/\\/g, "/"),
          url: "/assets/models/" + rel.replace(/\\/g, "/"),
          name,
          isDirectory: false,
          sizeBytes: st.size,
        });
      }
    }
  }

  if (fs.existsSync(modelsRoot)) {
    walk("");
  }

  return { modelsRoot, items };
}

const SAFE_FOLDER = /^[a-z0-9]+(?:_[a-z0-9]+)*$/i;
const SAFE_FILE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(glb|gltf)$/i;

/**
 * Normalize folder like "characters/custom" — only safe segments.
 */
export function sanitizeAdminGlbRelativeFolder(raw: unknown): { ok: true; folder: string } | { ok: false; errorDe: string } {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { ok: true, folder: "" };
  }
  const s = String(raw).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (s.includes("..")) {
    return { ok: false, errorDe: "Ordner darf keine .. enthalten." };
  }
  const parts = s.split("/").filter(Boolean);
  for (const p of parts) {
    if (!SAFE_FOLDER.test(p)) {
      return {
        ok: false,
        errorDe:
          "Ungültiger Ordnername: nur Buchstaben, Zahlen und Unterstriche, z. B. characters oder props_outdoor.",
      };
    }
  }
  return { ok: true, folder: parts.join("/") };
}

export function sanitizeAdminGlbFilename(original: string): { ok: true; filename: string } | { ok: false; errorDe: string } {
  const raw = String(original || "");
  if (raw.includes("..") || raw.includes("/") || raw.includes("\\")) {
    return { ok: false, errorDe: "Dateiname darf keine Pfade oder .. enthalten — nur der reine Dateiname." };
  }
  const base = path.basename(raw || "model.glb");
  if (!SAFE_FILE.test(base)) {
    return {
      ok: false,
      errorDe: "Dateiname: nur .glb oder .gltf, z. B. merchant_red.glb (Buchstaben, Zahlen, _ -).",
    };
  }
  return { ok: true, filename: base };
}
