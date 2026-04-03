import fs from "node:fs";
import path from "node:path";

/** Same resolution as GLBRegistry.scanModels base. */
export function getServerPublicModelsDir(): string {
  return path.resolve(process.cwd(), "../client/public/assets/models");
}

/**
 * Returns German user message if path is invalid for disk check, or null if OK.
 * Allows /world-assets/ and other URLs without local file check.
 */
export function validateAdminGlbPathForServer(glbPath: string): string | null {
  const p = glbPath.trim();
  if (!p.startsWith("/")) {
    return "Der Modell-Pfad muss mit / beginnen (z. B. /assets/models/…).";
  }
  if (!p.startsWith("/assets/models/")) {
    return null;
  }
  const rel = p.slice("/assets/models/".length);
  if (!rel || rel.includes("..")) {
    return "Ungültiger Pfad unter /assets/models/.";
  }
  const abs = path.join(getServerPublicModelsDir(), rel);
  if (!fs.existsSync(abs)) {
    return (
      "Diese Modell-Datei liegt auf dem Server nicht unter client/public/assets/models/. " +
      "Bitte Modell hochladen oder einen Pfad aus der Liste wählen."
    );
  }
  return null;
}
