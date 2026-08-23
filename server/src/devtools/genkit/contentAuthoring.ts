import fs from "node:fs/promises";
import path from "node:path";
import { gemini } from "@genkit-ai/googleai";
import { z } from "genkit";
import { findRepoRootWithGameData } from "../../modules/content/repoRoot.js";
import { areloriaGenkit } from "./index.js";
import { createProposalEnvelope, sha256Receipt } from "./contracts.js";

const modelName = process.env.GENKIT_MODEL?.trim() || "gemini-2.5-flash";
const authoringModel = gemini(modelName);

const StableContentIdSchema = z.string().min(1).max(120).regex(/^[a-z0-9][a-z0-9_-]*$/);

const CommonContentInputSchema = z
  .object({
    brief: z.string().min(1).max(12_000),
    existingContext: z.string().max(24_000).optional(),
    constraints: z.array(z.string().min(1).max(800)).max(32).optional(),
  })
  .strict();

export const QuestContentCandidateSchema = z
  .object({
    id: StableContentIdSchema,
    title: z.string().min(1).max(200),
    giverNpcId: StableContentIdSchema,
    targetNpcId: StableContentIdSchema.optional(),
    targetId: StableContentIdSchema.optional(),
    objectiveType: z.enum(["talk_to", "combat", "collect"]),
    requiredItemId: StableContentIdSchema.optional(),
    requiredCount: z.number().int().positive().max(1_000_000).optional(),
    prerequisiteQuestIds: z.array(StableContentIdSchema).max(32).optional(),
    requiredFlags: z.array(StableContentIdSchema).max(32).optional(),
    requiredReputation: z
      .record(
        z.object({
          min: z.number().finite().optional(),
          max: z.number().finite().optional(),
        }).strict(),
      )
      .optional(),
    reward: z
      .object({
        gold: z.number().int().nonnegative().max(1_000_000_000),
        xp: z.number().int().nonnegative().max(1_000_000_000),
        itemId: StableContentIdSchema.optional(),
      })
      .strict(),
  })
  .strict();

export const WorldObjectCandidateSchema = z
  .object({
    id: StableContentIdSchema,
    type: StableContentIdSchema,
    name: z.string().min(1).max(200),
    position: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
      })
      .strict(),
    rotation: z.number().finite(),
    scale: z.number().finite().positive().max(100),
    glbPath: z.string().min(1).max(500).regex(/^\/assets\//),
    interaction: z
      .object({
        type: StableContentIdSchema,
        dungeonId: StableContentIdSchema.optional(),
        targetId: StableContentIdSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const CandidateReceiptSchema = z
  .object({
    algorithm: z.literal("sha256"),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const ProposalEnvelopeFields = {
  truthClass: z.literal("SIDE_CHANNEL_PROPOSAL"),
  authoritativeMutationAllowed: z.literal(false),
  requiresReadback: z.literal(true),
  receipt: CandidateReceiptSchema,
};

const QuestContentPayloadSchema = z
  .object({
    targetContentPath: z.literal("game-data/quests/quests.json"),
    operation: z.literal("append_candidate"),
    candidate: QuestContentCandidateSchema,
    candidateReceipt: CandidateReceiptSchema,
    validationChecks: z.array(z.string().min(1).max(300)).max(32),
  })
  .strict();

const QuestContentOutputSchema = z
  .object({
    ...ProposalEnvelopeFields,
    proposalType: z.literal("QUEST_CONTENT_PROPOSAL"),
    effectClass: z.literal("CONTENT_PROPOSAL"),
    approval: z.literal("REVIEW_REQUIRED"),
    payload: QuestContentPayloadSchema,
  })
  .strict();

const WorldObjectPayloadSchema = z
  .object({
    targetContentPath: z.literal("game-data/world/objects.json"),
    operation: z.literal("append_candidate"),
    candidate: WorldObjectCandidateSchema,
    candidateReceipt: CandidateReceiptSchema,
    validationChecks: z.array(z.string().min(1).max(300)).max(32),
  })
  .strict();

const WorldObjectOutputSchema = z
  .object({
    ...ProposalEnvelopeFields,
    proposalType: z.literal("WORLD_OBJECT_PROPOSAL"),
    effectClass: z.literal("CONTENT_PROPOSAL"),
    approval: z.literal("REVIEW_REQUIRED"),
    payload: WorldObjectPayloadSchema,
  })
  .strict();

const AUTHORING_BOUNDARY = `
You are extending existing authored Areloria game-data. Return only a schema-valid candidate.
This is a proposal side-channel: never claim the candidate was written, loaded, spawned, tested, deployed or accepted.
Never include runtime authority fields, ticks, hashes, wall-clock timestamps, random UUIDs, CanonicalIntent fields, actor authority, persistence success or runtime outcomes.
Use stable lowercase content IDs. Existing content supplied by the operator is evidence; do not silently invent references that are not supported by the request/context.
`;

function contentPrompt(kind: string, input: z.infer<typeof CommonContentInputSchema>, realSchemaNote: string): string {
  return `${AUTHORING_BOUNDARY}\nTask: ${kind}\n${realSchemaNote}\n<request>\n${JSON.stringify(input, null, 2)}\n</request>`;
}

async function readGameDataArray(relativePath: string): Promise<unknown[]> {
  const root = findRepoRootWithGameData();
  if (!root) throw new Error("GENKIT_GAME_DATA_ROOT_NOT_FOUND");
  const absolutePath = path.join(root, "game-data", relativePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`GENKIT_EXPECTED_ARRAY:${relativePath}`);
  return parsed;
}

export function validateQuestContentCandidate(
  candidate: z.infer<typeof QuestContentCandidateSchema>,
  existingQuests: readonly unknown[],
): string[] {
  const checks: string[] = ["schema_valid:game-data/quests/quests.json"];
  const existingIds = new Set(
    existingQuests
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>).id : null))
      .filter((id): id is string => typeof id === "string"),
  );

  if (existingIds.has(candidate.id)) throw new Error(`GENKIT_QUEST_ID_ALREADY_EXISTS:${candidate.id}`);
  checks.push("quest_id_unique_against_authored_content");

  for (const prerequisite of candidate.prerequisiteQuestIds ?? []) {
    if (prerequisite === candidate.id) throw new Error(`GENKIT_QUEST_SELF_PREREQUISITE:${candidate.id}`);
    if (!existingIds.has(prerequisite)) throw new Error(`GENKIT_QUEST_PREREQUISITE_NOT_FOUND:${prerequisite}`);
  }
  checks.push("prerequisite_ids_exist_in_authored_content");

  if (candidate.objectiveType === "talk_to" && !candidate.targetNpcId) {
    throw new Error("GENKIT_QUEST_TALK_TARGET_REQUIRED");
  }
  if (candidate.objectiveType === "combat" && !candidate.targetId) {
    throw new Error("GENKIT_QUEST_COMBAT_TARGET_REQUIRED");
  }
  if (candidate.objectiveType === "collect") {
    if (!candidate.requiredItemId) throw new Error("GENKIT_QUEST_COLLECT_ITEM_REQUIRED");
    if (!candidate.requiredCount) throw new Error("GENKIT_QUEST_COLLECT_COUNT_REQUIRED");
  }
  checks.push("objective_shape_matches_authored_contract");

  return checks;
}

export function validateWorldObjectCandidate(
  candidate: z.infer<typeof WorldObjectCandidateSchema>,
  existingObjects: readonly unknown[],
): string[] {
  const checks: string[] = ["schema_valid:game-data/world/objects.json"];
  const existingIds = new Set(
    existingObjects
      .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>).id : null))
      .filter((id): id is string => typeof id === "string"),
  );

  if (existingIds.has(candidate.id)) throw new Error(`GENKIT_WORLD_OBJECT_ID_ALREADY_EXISTS:${candidate.id}`);
  checks.push("world_object_id_unique_against_authored_content");
  checks.push("asset_path_uses_published_assets_namespace");
  return checks;
}

export function candidateSha256(candidate: unknown): string {
  return sha256Receipt(candidate);
}

export const areloriaQuestContentFlow = areloriaGenkit.defineFlow(
  {
    name: "areloriaQuestContentFlow",
    inputSchema: CommonContentInputSchema,
    outputSchema: QuestContentOutputSchema,
  },
  async (input) => {
    const { output } = await areloriaGenkit.generate({
      model: authoringModel,
      config: { temperature: 0.35 },
      prompt: contentPrompt(
        "implementation-ready quest candidate",
        input,
        "Match the real authored schema used by game-data/quests/quests.json: id, title, giverNpcId, targetNpcId/targetId, objectiveType, optional prerequisite/requirements, and reward.",
      ),
      output: { schema: QuestContentCandidateSchema },
    });
    if (!output) throw new Error("GENKIT_QUEST_CONTENT_OUTPUT_EMPTY");

    const candidate = QuestContentCandidateSchema.parse(output);
    const existingQuests = await readGameDataArray("quests/quests.json");
    const validationChecks = validateQuestContentCandidate(candidate, existingQuests);
    const payload = {
      targetContentPath: "game-data/quests/quests.json" as const,
      operation: "append_candidate" as const,
      candidate,
      candidateReceipt: {
        algorithm: "sha256" as const,
        sha256: candidateSha256(candidate),
      },
      validationChecks,
    };

    return createProposalEnvelope({
      proposalType: "QUEST_CONTENT_PROPOSAL",
      effectClass: "CONTENT_PROPOSAL",
      approval: "REVIEW_REQUIRED",
      payload,
    });
  },
);

export const areloriaWorldObjectProposalFlow = areloriaGenkit.defineFlow(
  {
    name: "areloriaWorldObjectProposalFlow",
    inputSchema: CommonContentInputSchema,
    outputSchema: WorldObjectOutputSchema,
  },
  async (input) => {
    const { output } = await areloriaGenkit.generate({
      model: authoringModel,
      config: { temperature: 0.35 },
      prompt: contentPrompt(
        "implementation-ready world object candidate",
        input,
        "Match the real authored schema used by game-data/world/objects.json: stable id/type/name, position{x,y}, rotation, scale, published /assets/ glbPath, and optional interaction.",
      ),
      output: { schema: WorldObjectCandidateSchema },
    });
    if (!output) throw new Error("GENKIT_WORLD_OBJECT_OUTPUT_EMPTY");

    const candidate = WorldObjectCandidateSchema.parse(output);
    const existingObjects = await readGameDataArray("world/objects.json");
    const validationChecks = validateWorldObjectCandidate(candidate, existingObjects);
    const payload = {
      targetContentPath: "game-data/world/objects.json" as const,
      operation: "append_candidate" as const,
      candidate,
      candidateReceipt: {
        algorithm: "sha256" as const,
        sha256: candidateSha256(candidate),
      },
      validationChecks,
    };

    return createProposalEnvelope({
      proposalType: "WORLD_OBJECT_PROPOSAL",
      effectClass: "CONTENT_PROPOSAL",
      approval: "REVIEW_REQUIRED",
      payload,
    });
  },
);