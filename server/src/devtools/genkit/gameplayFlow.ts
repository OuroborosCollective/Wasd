import { z } from "genkit";
import { areloriaGenkit } from "./index.js";
import {
  EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS,
  executeGenkitGameplayAction,
  type GenkitGameplayOperatorRequest,
} from "./gameplayOperator.js";

const GameplayOperatorInputSchema = z
  .object({
    sessionId: z.string().min(8).max(96),
    sequence: z.number().int().positive(),
    playerId: z.string().min(1).max(96),
    action: z.enum(EXECUTABLE_GENKIT_GAMEPLAY_ACTIONS),
    payload: z.record(z.string(), z.unknown()).optional(),
    expectedRevisionHash: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  })
  .strict();

/**
 * Genkit control-plane execution flow.
 *
 * This flow does not ask a model to manufacture gameplay truth. It is a typed
 * Genkit orchestration surface around the real gameplayOperator, which in turn
 * either enqueues movement/combat into WorldTick or calls an existing
 * authoritative server route and requires real follow-up readback.
 */
export const areloriaGameplayOperatorFlow = areloriaGenkit.defineFlow(
  {
    name: "areloriaGameplayOperatorFlow",
    inputSchema: GameplayOperatorInputSchema,
    outputSchema: z.unknown(),
  },
  async (rawInput) => {
    // Genkit's current schema typing widens flow input fields to optional in
    // TypeScript even though the runtime Zod schema requires them. Re-parse at
    // the authority boundary, then construct the strict operator contract.
    const parsed = GameplayOperatorInputSchema.parse(rawInput);
    const input: GenkitGameplayOperatorRequest = {
      sessionId: parsed.sessionId,
      sequence: parsed.sequence,
      playerId: parsed.playerId,
      action: parsed.action,
      ...(parsed.payload === undefined ? {} : { payload: parsed.payload }),
      ...(parsed.expectedRevisionHash === undefined
        ? {}
        : { expectedRevisionHash: parsed.expectedRevisionHash }),
    };
    return executeGenkitGameplayAction(input);
  },
);
