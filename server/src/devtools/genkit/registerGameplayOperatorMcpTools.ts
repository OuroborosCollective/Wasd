import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS,
  executeGenkitGameplayAction,
  getGenkitGameplayCapabilities,
  readGenkitGameplaySnapshot,
} from "./gameplayOperator.js";

function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function errorResult(error: unknown) {
  return {
    isError: true,
    content: [{
      type: "text" as const,
      text: error instanceof Error ? error.message : String(error),
    }],
  };
}

export function registerGenkitGameplayOperatorMcpTools(mcpServer: McpServer): void {
  mcpServer.tool(
    "genkit_gameplay_capabilities",
    "Read the exact Genkit gameplay operator allowlist and current WASD runtime-port blockers. This is evidence, not a success claim.",
    {},
    async () => json(getGenkitGameplayCapabilities()),
  );

  mcpServer.tool(
    "genkit_gameplay_snapshot",
    "Read the authoritative gameplay snapshot for one operator-controlled player through the same server snapshot route used by clients.",
    { playerId: z.string().min(1).max(96) },
    async ({ playerId }) => {
      try {
        return json(await readGenkitGameplaySnapshot(playerId));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  mcpServer.tool(
    "genkit_gameplay_execute",
    "Execute one allowlisted gameplay action as a player through WASD's existing authoritative route/tick path. Sequence must strictly increase per session/player. Mutations return real follow-up readback and never infer success from the model response.",
    {
      sessionId: z.string().min(8).max(96),
      sequence: z.number().int().positive(),
      playerId: z.string().min(1).max(96),
      action: z.enum(EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS),
      payload: z.record(z.string(), z.unknown()).optional(),
      expectedRevisionHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    },
    async (input) => {
      try {
        return json(await executeGenkitGameplayAction(input));
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
