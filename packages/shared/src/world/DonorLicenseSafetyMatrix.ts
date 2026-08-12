/**
 * Donor license & asset safety matrix (CloudCraft integration #2468).
 *
 * Separates source-code license from media/asset license. MIT code
 * freedom does NOT imply media freedom. Every donor asset must have
 * provenance (source URL, license class, attribution, redistribution
 * terms) before it can be transferred.
 *
 * Asset license classes:
 * - permissive: CC0, MIT — no attribution required, commercial use OK.
 * - attribution: CC-BY, OFL — attribution required, commercial use OK.
 * - non-commercial: CC-BY-NC — commercial use blocked.
 * - project-only: custom license restricting use to this project only.
 * - permission-required: no clear license, explicit author permission needed.
 * - unknown: no provenance, no license — blocked until clarified.
 *
 * Blocked classes: non-commercial, project-only, permission-required, unknown.
 */

export type AssetLicenseClass =
  | "permissive"
  | "attribution"
  | "non-commercial"
  | "project-only"
  | "permission-required"
  | "unknown";

export type DonorTransferCategory = "code" | "architecture" | "data" | "tests" | "documentation" | "media";

export interface DonorAssetProvenance {
  readonly id: string;
  readonly sourceUrl: string;
  readonly licenseClass: AssetLicenseClass;
  readonly licenseName: string;
  readonly licenseUrl: string | null;
  readonly attributionRequired: boolean;
  readonly commercialUseAllowed: boolean;
  readonly redistributionAllowed: boolean;
  readonly sourceVerified: boolean;
  readonly binaryImportStatus: "imported" | "blocked" | "pending";
  readonly notes: readonly string[];
}

export interface DonorCandidate {
  readonly id: string;
  readonly category: DonorTransferCategory;
  readonly provenance: DonorAssetProvenance | null;
  readonly transferAllowed: boolean;
  readonly blockReason: string | null;
}

/**
 * Donor repository pin. The donor stand is uniquely identified by
 * repo, tag/branch, and commit so the audit is reproducible.
 */
export const DONOR_REPOSITORY_PIN = Object.freeze({
  repo: "cloudcraft-donor",
  branch: "main",
  commit: "not-pinned-yet",
  pinnedDate: "2026-08-11",
  note: "Donor repo, branch, and commit must be pinned before any code/media transfer. Currently not pinned — all transfers blocked until pinned.",
} as const);

/**
 * License class matrix: which classes are allowed vs blocked.
 */
export const ASSET_LICENSE_CLASS_MATRIX = Object.freeze({
  permissive: { allowed: true, requiresAttribution: false, commercialUse: true, redistribution: true },
  attribution: { allowed: true, requiresAttribution: true, commercialUse: true, redistribution: true },
  "non-commercial": { allowed: false, requiresAttribution: true, commercialUse: false, redistribution: false },
  "project-only": { allowed: false, requiresAttribution: true, commercialUse: false, redistribution: false },
  "permission-required": { allowed: false, requiresAttribution: true, commercialUse: false, redistribution: false },
  unknown: { allowed: false, requiresAttribution: true, commercialUse: false, redistribution: false },
} as const);

/**
 * Blocked asset classes — explicitly listed so import scripts can
 * refuse them before binary import.
 */
export const BLOCKED_ASSET_CLASSES: readonly AssetLicenseClass[] = Object.freeze([
  "non-commercial",
  "project-only",
  "permission-required",
  "unknown",
]);

export function isAssetClassBlocked(licenseClass: AssetLicenseClass): boolean {
  return BLOCKED_ASSET_CLASSES.includes(licenseClass);
}

/**
 * Evaluate a donor candidate for transfer safety.
 * Returns whether the transfer is allowed and, if not, the block reason.
 */
export function evaluateDonorCandidate(candidate: DonorCandidate): {
  allowed: boolean;
  reason: string | null;
} {
  if (DONOR_REPOSITORY_PIN.commit === "not-pinned-yet") {
    return { allowed: false, reason: "donor_repo_not_pinned" };
  }
  if (candidate.category === "media" && !candidate.provenance) {
    return { allowed: false, reason: "media_missing_provenance" };
  }
  if (candidate.provenance && isAssetClassBlocked(candidate.provenance.licenseClass)) {
    return {
      allowed: false,
      reason: `license_class_blocked:${candidate.provenance.licenseClass}`,
    };
  }
  if (candidate.provenance && !candidate.provenance.sourceVerified) {
    return { allowed: false, reason: "source_not_verified" };
  }
  return { allowed: true, reason: null };
}

/**
 * Initial donor candidate inventory. These are the known asset packs
 * already referenced in the repository with their provenance status.
 */
export const DONOR_CANDIDATE_INVENTORY: readonly DonorCandidate[] = Object.freeze([
  {
    id: "kenney-ui-pack",
    category: "media",
    provenance: {
      id: "kenney-ui-pack",
      sourceUrl: "https://kenney.nl/assets/ui-pack",
      licenseClass: "permissive",
      licenseName: "Creative Commons CC0 1.0 Universal",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: true,
      sourceVerified: true,
      binaryImportStatus: "imported",
      notes: ["Visual-only UI assets for client-2d HUD, skillbar, inventory panels."],
    },
    transferAllowed: true,
    blockReason: null,
  },
  {
    id: "kenney-tiny-town",
    category: "media",
    provenance: {
      id: "kenney-tiny-town",
      sourceUrl: "https://kenney.nl/assets/tiny-town",
      licenseClass: "permissive",
      licenseName: "Creative Commons CC0 1.0 Universal",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: true,
      sourceVerified: true,
      binaryImportStatus: "blocked",
      notes: ["Blocked until download implemented."],
    },
    transferAllowed: false,
    blockReason: "binary_import_blocked",
  },
  {
    id: "kenney-tiny-dungeon",
    category: "media",
    provenance: {
      id: "kenney-tiny-dungeon",
      sourceUrl: "https://kenney-assets.itch.io/tiny-dungeon",
      licenseClass: "permissive",
      licenseName: "Creative Commons CC0 1.0 Universal",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: true,
      sourceVerified: true,
      binaryImportStatus: "blocked",
      notes: ["Blocked until download implemented."],
    },
    transferAllowed: false,
    blockReason: "binary_import_blocked",
  },
  {
    id: "ninja-adventure",
    category: "media",
    provenance: {
      id: "ninja-adventure",
      sourceUrl: "https://pixel-boy.itch.io/ninja-adventure-asset-pack",
      licenseClass: "permissive",
      licenseName: "Creative Commons CC0 1.0 Universal",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      attributionRequired: false,
      commercialUseAllowed: true,
      redistributionAllowed: true,
      sourceVerified: true,
      binaryImportStatus: "blocked",
      notes: ["Blocked until download implemented."],
    },
    transferAllowed: false,
    blockReason: "binary_import_blocked",
  },
]);

/**
 * Explicit rule: MIT code license does NOT imply media freedom.
 * The repository LICENSE is a strict proprietary notice, NOT MIT.
 * Code transfers from the donor must be evaluated separately from media.
 */
export const LICENSE_SEPARATION_RULE = Object.freeze({
  codeLicense: "donor-code-license (must be evaluated separately)",
  mediaLicense: "per-asset provenance required",
  rule: "MIT-Codefreigabe ist keine pauschale Medienfreigabe. Code-Lizenz und Medien-Lizenz werden niemals vermischt.",
} as const);
