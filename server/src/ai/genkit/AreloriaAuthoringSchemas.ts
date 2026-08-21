import { z } from "genkit";

const CanonicalIdSchema = z
  .string()
  .min(2)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/);

const Kappa1000Schema = z.number().int().min(0).max(1000);

export const AuthoringProvenanceSchema = z.object({
  schemaVersion: z.literal("areloria-authoring-v1"),
  requestId: CanonicalIdSchema,
  authorId: CanonicalIdSchema,
  sourceRefs: z.array(CanonicalIdSchema).max(128),
  canonicalTickContext: z.number().int().min(0).nullable(),
});

export const QuestStepProposalSchema = z.object({
  id: CanonicalIdSchema,
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(800),
  objectiveType: z.enum([
    "talk",
    "gather",
    "craft",
    "explore",
    "defeat",
    "deliver",
    "interact",
  ]),
  targetRef: CanonicalIdSchema,
  amount: z.number().int().min(1).max(10000),
  dependsOn: z.array(CanonicalIdSchema).max(16),
});

export const QuestRewardProposalSchema = z.object({
  kind: z.enum(["xp", "currency", "item", "reputation"]),
  targetRef: CanonicalIdSchema,
  amount: z.number().int().min(1).max(1_000_000),
});

export const QuestProposalSchema = z.object({
  kind: z.literal("quest"),
  id: CanonicalIdSchema,
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(600),
  giverNpcRef: CanonicalIdSchema,
  factionRef: CanonicalIdSchema.nullable(),
  locationRef: CanonicalIdSchema,
  minLevel: z.number().int().min(1).max(1000),
  steps: z.array(QuestStepProposalSchema).min(1).max(24),
  rewards: z.array(QuestRewardProposalSchema).max(16),
  worldConsequences: z.array(z.string().min(1).max(320)).max(16),
  resonanceKappa: Kappa1000Schema,
  provenance: AuthoringProvenanceSchema,
});

export const WorldPoiProposalSchema = z.object({
  kind: z.literal("world_poi"),
  id: CanonicalIdSchema,
  name: z.string().min(1).max(140),
  summary: z.string().min(1).max(800),
  biomeRef: CanonicalIdSchema,
  chunkRef: CanonicalIdSchema,
  factionRef: CanonicalIdSchema.nullable(),
  encounterRefs: z.array(CanonicalIdSchema).max(24),
  resourceRefs: z.array(CanonicalIdSchema).max(24),
  questHooks: z.array(z.string().min(1).max(320)).max(16),
  resonanceKappa: Kappa1000Schema,
  provenance: AuthoringProvenanceSchema,
});

export const NPCDialogueProposalSchema = z.object({
  kind: z.literal("npc_dialogue"),
  id: CanonicalIdSchema,
  npcRef: CanonicalIdSchema,
  context: z.string().min(1).max(400),
  lines: z.array(z.string().min(1).max(500)).min(1).max(24),
  provenance: AuthoringProvenanceSchema,
});

export const LoreProposalSchema = z.object({
  kind: z.literal("lore"),
  id: CanonicalIdSchema,
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(5000),
  relatedRefs: z.array(CanonicalIdSchema).max(64),
  provenance: AuthoringProvenanceSchema,
});

export const WorldEventAuthoringProposalSchema = z.object({
  kind: z.literal("world_event"),
  id: CanonicalIdSchema,
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(1000),
  triggerRefs: z.array(CanonicalIdSchema).min(1).max(32),
  affectedRefs: z.array(CanonicalIdSchema).max(64),
  proposedEffects: z.array(z.string().min(1).max(320)).max(24),
  resonanceKappa: Kappa1000Schema,
  provenance: AuthoringProvenanceSchema,
});

export const AreloriaAuthoringProposalSchema = z.discriminatedUnion("kind", [
  QuestProposalSchema,
  WorldPoiProposalSchema,
  NPCDialogueProposalSchema,
  LoreProposalSchema,
  WorldEventAuthoringProposalSchema,
]);

export const QuestAuthoringRequestSchema = z.object({
  requestId: CanonicalIdSchema,
  authorId: CanonicalIdSchema,
  brief: z.string().min(8).max(8000),
  canonicalTickContext: z.number().int().min(0).nullable().default(null),
  sourceRefs: z.array(CanonicalIdSchema).max(128).default([]),
  constraints: z.array(z.string().min(1).max(600)).max(64).default([]),
});

export const WorldPoiAuthoringRequestSchema = z.object({
  requestId: CanonicalIdSchema,
  authorId: CanonicalIdSchema,
  brief: z.string().min(8).max(8000),
  canonicalTickContext: z.number().int().min(0).nullable().default(null),
  sourceRefs: z.array(CanonicalIdSchema).max(128).default([]),
  constraints: z.array(z.string().min(1).max(600)).max(64).default([]),
});

export type QuestProposal = z.infer<typeof QuestProposalSchema>;
export type WorldPoiProposal = z.infer<typeof WorldPoiProposalSchema>;
export type AreloriaAuthoringProposal = z.infer<typeof AreloriaAuthoringProposalSchema>;
export type QuestAuthoringRequest = z.infer<typeof QuestAuthoringRequestSchema>;
export type WorldPoiAuthoringRequest = z.infer<typeof WorldPoiAuthoringRequestSchema>;