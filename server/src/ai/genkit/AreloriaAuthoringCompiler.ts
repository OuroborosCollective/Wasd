import { createHash } from "node:crypto";
import {
  AreloriaAuthoringProposalSchema,
  type AreloriaAuthoringProposal,
  type QuestProposal,
} from "./AreloriaAuthoringSchemas.js";

export interface AuthoringValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

export interface CompiledAuthoringContent {
  readonly proposal: AreloriaAuthoringProposal;
  readonly canonicalJson: string;
  readonly proposalHash: string;
  readonly targetPath: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value as Record<string, unknown>)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = canonicalize((value as Record<string, unknown>)[key]);
      return result;
    }, {});
}

export function canonicalAuthoringJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function hashCanonicalAuthoringContent(canonicalJson: string): string {
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort((a, b) => a.localeCompare(b));
}

function validateQuestGraph(quest: QuestProposal): string[] {
  const errors: string[] = [];
  const stepIds = quest.steps.map((step) => step.id);
  const stepIdSet = new Set(stepIds);

  for (const duplicate of duplicateValues(stepIds)) {
    errors.push(`duplicate_step_id:${duplicate}`);
  }

  for (const step of quest.steps) {
    if (step.dependsOn.includes(step.id)) {
      errors.push(`self_dependency:${step.id}`);
    }
    for (const dependency of step.dependsOn) {
      if (!stepIdSet.has(dependency)) {
        errors.push(`missing_step_dependency:${step.id}:${dependency}`);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byId = new Map(quest.steps.map((step) => [step.id, step] as const));

  const visit = (stepId: string): void => {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) {
      errors.push(`cyclic_step_dependency:${stepId}`);
      return;
    }

    visiting.add(stepId);
    const step = byId.get(stepId);
    for (const dependency of step?.dependsOn ?? []) {
      if (byId.has(dependency)) visit(dependency);
    }
    visiting.delete(stepId);
    visited.add(stepId);
  };

  for (const stepId of [...stepIds].sort((a, b) => a.localeCompare(b))) visit(stepId);
  return errors;
}

function targetPathFor(proposal: AreloriaAuthoringProposal): string {
  switch (proposal.kind) {
    case "quest":
      return `game-data/quests/generated/${proposal.id}.json`;
    case "world_poi":
      return `game-data/world/poi/generated/${proposal.id}.json`;
    case "npc_dialogue":
      return `game-data/dialogue/generated/${proposal.id}.json`;
    case "lore":
      return `game-data/lore/generated/${proposal.id}.json`;
    case "world_event":
      return `game-data/world/events/generated/${proposal.id}.json`;
  }
}

export function validateAuthoringProposal(input: unknown): AuthoringValidationResult {
  const parsed = AreloriaAuthoringProposalSchema.safeParse(input);
  if (!parsed.success) {
    return Object.freeze({
      ok: false,
      errors: Object.freeze(
        parsed.error.issues
          .map((issue) => `schema:${issue.path.join(".")}:${issue.message}`)
          .sort((a, b) => a.localeCompare(b)),
      ),
    });
  }

  const errors: string[] = [];
  const proposal = parsed.data;

  if (proposal.provenance.canonicalTickContext !== null) {
    if (!Number.isInteger(proposal.provenance.canonicalTickContext) || proposal.provenance.canonicalTickContext < 0) {
      errors.push("invalid_canonical_tick_context");
    }
  }

  if (proposal.kind === "quest") errors.push(...validateQuestGraph(proposal));

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze([...new Set(errors)].sort((a, b) => a.localeCompare(b))),
  });
}

export function compileAuthoringProposal(input: unknown): CompiledAuthoringContent {
  const parsed = AreloriaAuthoringProposalSchema.parse(input);
  const validation = validateAuthoringProposal(parsed);
  if (!validation.ok) {
    throw new Error(`AUTHORING_PROPOSAL_REJECTED:${validation.errors.join(",")}`);
  }

  const canonicalJson = canonicalAuthoringJson(parsed);
  return Object.freeze({
    proposal: parsed,
    canonicalJson,
    proposalHash: hashCanonicalAuthoringContent(canonicalJson),
    targetPath: targetPathFor(parsed),
  });
}