import { gemini } from "@genkit-ai/googleai";
import { z } from "genkit";
import {
  validateQuestContentDefinitionAgainstContext,
  type QuestContentReferenceContext,
} from "../../modules/content/questContentContract.js";
import { areloriaGenkit } from "./index.js";
import { createProposalEnvelope } from "./contracts.js";
import {
  buildAuthoringPromptContext,
  loadAreloriaAuthoringContext,
} from "./worldContext.js";

const CanonicalQuestInputSchema = z
  .object({
    brief: z.string().min(1).max(12_000),
    constraints: z.array(z.string().min(1).max(800)).max(32).optional(),
    creativeDirection: z.string().max(4_000).optional(),
  })
  .strict();

const ReputationRangeSchema = z
  .object({
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
  })
  .strict();

const CanonicalQuestSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,119}$/),
    title: z.string().min(1).max(200),
    giverNpcId: z.string().min(1).max(120),
    objectiveType: z.enum(["talk_to", "combat", "collect"]),
    targetNpcId: z.string().min(1).max(120).optional(),
    targetId: z.string().min(1).max(120).optional(),
    requiredItemId: z.string().min(1).max(120).optional(),
    requiredCount: z.number().int().min(1).optional(),
    prerequisiteQuestIds: z.array(z.string().min(1).max(120)).max(24).optional(),
    requiredFlags: z.array(z.string().min(1).max(120)).max(24).optional(),
    requiredReputation: z.record(z.string(), ReputationRangeSchema).optional(),
    reward: z
      .object({
        gold: z.number().int().min(0),
        xp: z.number().int().min(0),
        itemId: z.string().min(1).max(120).optional(),
      })
      .strict(),
  })
  .strict();

const CanonicalQuestPayloadSchema = z
  .object({
    sourceContentHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceMode: z.enum(["published", "pack_dir", "legacy"]),
    quest: CanonicalQuestSchema,
    validation: z
      .object({
        ok: z.literal(true),
        errors: z.array(z.string()).max(0),
      })
      .strict(),
    promotion: z
      .object({
        targetContentPath: z.literal("quests/quests.json"),
        requiresOwnerReview: z.literal(true),
        writePerformed: z.literal(false),
      })
      .strict(),
  })
  .strict();

const CanonicalQuestOutputSchema = z
  .object({
    truthClass: z.literal("SIDE_CHANNEL_PROPOSAL"),
    authoritativeMutationAllowed: z.literal(false),
    requiresReadback: z.literal(true),
    receipt: z
      .object({
        algorithm: z.literal("sha256"),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    proposalType: z.literal("CANONICAL_QUEST_PROPOSAL"),
    effectClass: z.literal("CONTENT_PROPOSAL"),
    approval: z.literal("REVIEW_REQUIRED"),
    payload: CanonicalQuestPayloadSchema,
  })
  .strict();

const modelName = process.env.GENKIT_MODEL?.trim() || "gemini-2.5-flash";
const model = gemini(modelName);

function toReferenceContext(context: ReturnType<typeof loadAreloriaAuthoringContext>): QuestContentReferenceContext {
  return {
    npcIds: new Set(context.npcs.map((npc) => npc.id)),
    itemIds: new Set(context.items.map((item) => item.id)),
    questIds: new Set(context.quests.map((quest) => quest.id)),
  };
}

export const areloriaCanonicalQuestProposalFlow = areloriaGenkit.defineFlow(
  {
    name: "areloriaCanonicalQuestProposalFlow",
    inputSchema: CanonicalQuestInputSchema,
    outputSchema: CanonicalQuestOutputSchema,
  },
  async (input) => {
    const context = loadAreloriaAuthoringContext();
    const promptContext = buildAuthoringPromptContext(context);
    const constraints = input.constraints?.length
      ? `Additional constraints:\n- ${input.constraints.join("\n- ")}`
      : "No additional constraints.";

    const { output } = await areloriaGenkit.generate({
      model,
      config: { temperature: 0.35 },
      prompt: `You author REVIEW-ONLY Areloria quest content.\n\nThe following JSON is the real, validated selected game-data authoring context. Use only NPC, item and prerequisite quest IDs that actually occur in this context. Do not invent runtime state, player progress, ticks, actors, chunks, hashes or execution evidence.\n\n<areloria_content_context>\n${promptContext}\n</areloria_content_context>\n\n<brief>\n${input.brief}\n</brief>\n\n<creative_direction>\n${input.creativeDirection ?? ""}\n</creative_direction>\n\n${constraints}\n\nProduce exactly one new quest definition matching the schema. Choose an id that does not already exist. For talk_to, set targetNpcId. For combat, set targetId to an existing NPC id. For collect, set requiredItemId and requiredCount. Reward items, if any, must exist in the context.`,
      output: { schema: CanonicalQuestSchema },
    });

    if (!output) throw new Error("Genkit returned no schema-valid canonical quest proposal.");

    const errors = validateQuestContentDefinitionAgainstContext(
      output,
      toReferenceContext(context),
      { allowExistingId: false },
      "proposal.quest",
    );
    if (errors.length > 0) {
      throw new Error(`Canonical quest proposal failed real content validation: ${errors.join("; ")}`);
    }

    return createProposalEnvelope({
      proposalType: "CANONICAL_QUEST_PROPOSAL",
      effectClass: "CONTENT_PROPOSAL",
      approval: "REVIEW_REQUIRED",
      payload: {
        sourceContentHash: context.sourceContentHash,
        sourceMode: context.sourceMode,
        quest: output,
        validation: { ok: true as const, errors: [] as string[] },
        promotion: {
          targetContentPath: "quests/quests.json" as const,
          requiresOwnerReview: true as const,
          writePerformed: false as const,
        },
      },
    });
  },
);
