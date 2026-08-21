import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { genkitAuthoringRuntime } from "../../ai/genkit/GenkitAuthoringRuntime.js";

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ ok: false, error: message }, null, 2) }],
  };
}

const requestFields = {
  requestId: z.string().min(2).max(96),
  authorId: z.string().min(2).max(96),
  brief: z.string().min(8).max(8000),
  canonicalTickContext: z.number().int().nonnegative().nullable().default(null),
  sourceRefs: z.array(z.string().min(2).max(96)).max(128).default([]),
  constraints: z.array(z.string().min(1).max(600)).max(64).default([]),
};

export function registerGenkitAuthoringMcpTools(mcpServer: McpServer): void {
  mcpServer.tool(
    "genkit_authoring_status",
    "Report whether the Areloria Genkit authoring side-channel is configured. This never reports gameplay/runtime authority.",
    {},
    async () => json(genkitAuthoringRuntime.getStatus()),
  );

  mcpServer.tool(
    "genkit_propose_quest",
    "Generate and deterministically compile one Areloria quest proposal. Returns proposal, canonical JSON, target path and SHA-256; does not write game-data or mutate runtime state.",
    requestFields,
    async (input) => {
      try {
        const compiled = await genkitAuthoringRuntime.proposeQuest(input);
        return json({
          ok: true,
          authority: "authoring_side_channel",
          proposal: compiled.proposal,
          proposalHash: compiled.proposalHash,
          targetPath: compiled.targetPath,
          canonicalJson: compiled.canonicalJson,
          written: false,
          requiresExplicitStudioWrite: true,
          authoritativeGameplayMutation: false,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  mcpServer.tool(
    "genkit_propose_world_poi",
    "Generate and deterministically compile one Areloria world-POI proposal. Returns proposal, canonical JSON, target path and SHA-256; does not write game-data or mutate runtime state.",
    requestFields,
    async (input) => {
      try {
        const compiled = await genkitAuthoringRuntime.proposeWorldPoi(input);
        return json({
          ok: true,
          authority: "authoring_side_channel",
          proposal: compiled.proposal,
          proposalHash: compiled.proposalHash,
          targetPath: compiled.targetPath,
          canonicalJson: compiled.canonicalJson,
          written: false,
          requiresExplicitStudioWrite: true,
          authoritativeGameplayMutation: false,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}