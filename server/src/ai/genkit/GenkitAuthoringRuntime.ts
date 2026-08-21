import { genkit } from "genkit";
import { gemini, googleAI } from "@genkit-ai/googleai";
import {
  QuestAuthoringRequestSchema,
  QuestProposalSchema,
  WorldPoiAuthoringRequestSchema,
  WorldPoiProposalSchema,
  type QuestAuthoringRequest,
  type QuestProposal,
  type WorldPoiAuthoringRequest,
  type WorldPoiProposal,
} from "./AreloriaAuthoringSchemas.js";
import {
  compileAuthoringProposal,
  type CompiledAuthoringContent,
} from "./AreloriaAuthoringCompiler.js";

const QuestModelDraftSchema = QuestProposalSchema.omit({ provenance: true });
const WorldPoiModelDraftSchema = WorldPoiProposalSchema.omit({ provenance: true });

export interface GenkitAuthoringStatus {
  readonly available: boolean;
  readonly provider: "googleai";
  readonly package: "@genkit-ai/googleai";
  readonly model: string;
  readonly authority: "authoring_side_channel";
  readonly migrationRequired: boolean;
  readonly reason?: string;
}

export interface GenkitAuthoringRuntimeOptions {
  readonly apiKey?: string;
  readonly model?: string;
}

function resolveApiKey(explicit?: string): string {
  return (
    explicit
    ?? process.env.GEMINI_API_KEY
    ?? process.env.GOOGLE_API_KEY
    ?? process.env.GOOGLE_GENAI_API_KEY
    ?? ""
  ).trim();
}

function stableLines(values: readonly string[]): string {
  return [...values].map((value) => value.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)).join("\n- ");
}

function buildQuestPrompt(input: QuestAuthoringRequest): string {
  const refs = stableLines(input.sourceRefs);
  const constraints = stableLines(input.constraints);
  return [
    "You are the Areloria quest authoring side-channel.",
    "Create a structured quest proposal only. You have no authority to mutate runtime state.",
    "Use lowercase stable ids made only from [a-z0-9._:-]. Never use current time, random UUIDs, or wall-clock values in ids.",
    "Every objective must be representable by normal player/NPC gameplay actions.",
    "Do not invent success receipts, ticks, hashes, inventory state, quest completion, or runtime outcomes.",
    "The proposal will be validated and canonically compiled before game-data can change.",
    `Brief: ${input.brief}`,
    `Canonical tick context (context only, not authority): ${input.canonicalTickContext ?? "none"}`,
    `Source refs:\n- ${refs || "none"}`,
    `Constraints:\n- ${constraints || "none"}`,
  ].join("\n\n");
}

function buildWorldPoiPrompt(input: WorldPoiAuthoringRequest): string {
  const refs = stableLines(input.sourceRefs);
  const constraints = stableLines(input.constraints);
  return [
    "You are the Areloria world authoring side-channel.",
    "Create one structured world POI proposal only. You have no authority to mutate runtime state or place entities live.",
    "Use lowercase stable ids made only from [a-z0-9._:-]. Never use current time, random UUIDs, or wall-clock values in ids.",
    "Reference canonical biomes, chunks, factions, resources, encounters and quest hooks when supplied.",
    "Do not invent runtime ticks, hashes, live population, ownership or persistence success.",
    "The proposal will be validated and canonically compiled before game-data can change.",
    `Brief: ${input.brief}`,
    `Canonical tick context (context only, not authority): ${input.canonicalTickContext ?? "none"}`,
    `Source refs:\n- ${refs || "none"}`,
    `Constraints:\n- ${constraints || "none"}`,
  ].join("\n\n");
}

export class GenkitAuthoringRuntime {
  private readonly apiKey: string;
  private readonly modelName: string;
  private readonly ai: ReturnType<typeof genkit> | null;
  private readonly questFlow: ((input: QuestAuthoringRequest) => Promise<QuestProposal>) | null;
  private readonly worldPoiFlow: ((input: WorldPoiAuthoringRequest) => Promise<WorldPoiProposal>) | null;

  constructor(options: GenkitAuthoringRuntimeOptions = {}) {
    this.apiKey = resolveApiKey(options.apiKey);
    this.modelName = options.model?.trim() || process.env.ARELORIA_GENKIT_MODEL?.trim() || "gemini-2.5-flash";

    if (!this.apiKey) {
      this.ai = null;
      this.questFlow = null;
      this.worldPoiFlow = null;
      return;
    }

    this.ai = genkit({
      plugins: [googleAI({ apiKey: this.apiKey })],
    });

    this.questFlow = this.ai.defineFlow(
      {
        name: "areloriaQuestAuthoringV1",
        inputSchema: QuestAuthoringRequestSchema,
        outputSchema: QuestProposalSchema,
      },
      async (input) => {
        const response = await this.ai!.generate({
          model: gemini(this.modelName),
          prompt: buildQuestPrompt(input),
          output: { schema: QuestModelDraftSchema },
        });

        if (!response.output) throw new Error("GENKIT_QUEST_OUTPUT_EMPTY");

        return QuestProposalSchema.parse({
          ...response.output,
          kind: "quest",
          provenance: {
            schemaVersion: "areloria-authoring-v1",
            requestId: input.requestId,
            authorId: input.authorId,
            sourceRefs: [...input.sourceRefs].sort((a, b) => a.localeCompare(b)),
            canonicalTickContext: input.canonicalTickContext,
          },
        });
      },
    ) as (input: QuestAuthoringRequest) => Promise<QuestProposal>;

    this.worldPoiFlow = this.ai.defineFlow(
      {
        name: "areloriaWorldPoiAuthoringV1",
        inputSchema: WorldPoiAuthoringRequestSchema,
        outputSchema: WorldPoiProposalSchema,
      },
      async (input) => {
        const response = await this.ai!.generate({
          model: gemini(this.modelName),
          prompt: buildWorldPoiPrompt(input),
          output: { schema: WorldPoiModelDraftSchema },
        });

        if (!response.output) throw new Error("GENKIT_WORLD_POI_OUTPUT_EMPTY");

        return WorldPoiProposalSchema.parse({
          ...response.output,
          kind: "world_poi",
          provenance: {
            schemaVersion: "areloria-authoring-v1",
            requestId: input.requestId,
            authorId: input.authorId,
            sourceRefs: [...input.sourceRefs].sort((a, b) => a.localeCompare(b)),
            canonicalTickContext: input.canonicalTickContext,
          },
        });
      },
    ) as (input: WorldPoiAuthoringRequest) => Promise<WorldPoiProposal>;
  }

  getStatus(): GenkitAuthoringStatus {
    if (!this.ai) {
      return Object.freeze({
        available: false,
        provider: "googleai",
        package: "@genkit-ai/googleai",
        model: this.modelName,
        authority: "authoring_side_channel",
        migrationRequired: true,
        reason: "Missing Gemini API credential. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENAI_API_KEY.",
      });
    }

    return Object.freeze({
      available: true,
      provider: "googleai",
      package: "@genkit-ai/googleai",
      model: this.modelName,
      authority: "authoring_side_channel",
      migrationRequired: true,
      reason: "Legacy Genkit Google AI plugin is active; migrate to @genkit-ai/google-genai in a lockfile-safe dependency update.",
    });
  }

  async proposeQuest(rawInput: unknown): Promise<CompiledAuthoringContent> {
    if (!this.questFlow) throw new Error("GENKIT_AUTHORING_UNAVAILABLE");
    const input = QuestAuthoringRequestSchema.parse(rawInput);
    const proposal = await this.questFlow(input);
    return compileAuthoringProposal(proposal);
  }

  async proposeWorldPoi(rawInput: unknown): Promise<CompiledAuthoringContent> {
    if (!this.worldPoiFlow) throw new Error("GENKIT_AUTHORING_UNAVAILABLE");
    const input = WorldPoiAuthoringRequestSchema.parse(rawInput);
    const proposal = await this.worldPoiFlow(input);
    return compileAuthoringProposal(proposal);
  }
}

export const genkitAuthoringRuntime = new GenkitAuthoringRuntime();