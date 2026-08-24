import { createHash } from "node:crypto";

export const ARELORIA_GENKIT_TRUTH_CLASS = "SIDE_CHANNEL_PROPOSAL" as const;

export type AreloriaGenkitEffectClass =
  | "CONTENT_PROPOSAL"
  | "UI_CODE_PLAN"
  | "DATABASE_WRITE_PLAN"
  | "REPOSITORY_WRITE_PLAN"
  | "OBSERVABILITY_ANALYSIS"
  | "ASSET_PLAN";

export type AreloriaGenkitApproval = "REVIEW_REQUIRED" | "OWNER_REQUIRED";

const FORBIDDEN_AUTHORITY_KEYS = new Set([
  "actorid",
  "authority",
  "authoritativeoutcome",
  "canonicalintent",
  "chunkkey",
  "intenthash",
  "kappa",
  "logicalindex",
  "manifesthash",
  "receivedorder",
  "serverauthority",
  "servercanonicalintent",
  "snapshothash",
  "tick",
  "tickid",
  "worldhash",
]);

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

/**
 * Genkit is a development/content side-channel. It must never manufacture the
 * fields that turn an external wish into authoritative Areloria gameplay truth.
 */
export function assertSideChannelPayload(value: unknown, path = "$payload"): void {
  if (value === null || value === undefined) return;

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSideChannelPayload(entry, `${path}[${index}]`));
    return;
  }

  if (typeof value !== "object") return;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeKey(key);
    if (FORBIDDEN_AUTHORITY_KEYS.has(normalized)) {
      throw new Error(
        `Genkit side-channel payload attempted to set authoritative field '${key}' at ${path}.`
      );
    }
    assertSideChannelPayload(child, `${path}.${key}`);
  }
}

function normalizeForCanonicalJson(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Non-finite numbers cannot be included in a Genkit receipt.");
    }
    return value;
  }

  if (typeof value === "undefined") return null;

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForCanonicalJson(entry, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      throw new Error("Circular values cannot be included in a Genkit receipt.");
    }
    seen.add(value);

    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (typeof child === "undefined") continue;
      normalized[key] = normalizeForCanonicalJson(child, seen);
    }

    seen.delete(value);
    return normalized;
  }

  throw new Error(`Unsupported receipt value type: ${typeof value}`);
}

export function canonicalizeForReceipt(value: unknown): string {
  return JSON.stringify(normalizeForCanonicalJson(value, new WeakSet<object>()));
}

export function sha256Receipt(value: unknown): string {
  return createHash("sha256").update(canonicalizeForReceipt(value), "utf8").digest("hex");
}

export function createProposalEnvelope<
  TPayload,
  TProposalType extends string,
  TEffectClass extends AreloriaGenkitEffectClass,
  TApproval extends AreloriaGenkitApproval,
>(args: {
  proposalType: TProposalType;
  effectClass: TEffectClass;
  approval: TApproval;
  payload: TPayload;
}) {
  assertSideChannelPayload(args.payload);

  const receiptInput = {
    proposalType: args.proposalType,
    truthClass: ARELORIA_GENKIT_TRUTH_CLASS,
    authoritativeMutationAllowed: false as const,
    requiresReadback: true as const,
    effectClass: args.effectClass,
    approval: args.approval,
    payload: args.payload,
  };

  return Object.freeze({
    ...receiptInput,
    receipt: Object.freeze({
      algorithm: "sha256" as const,
      sha256: sha256Receipt(receiptInput),
    }),
  });
}
