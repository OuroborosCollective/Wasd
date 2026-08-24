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
    // The Genkit-integrated Zod typing widens object fields to optional even
    // after parse(). Runtime validation is still strict; narrow only after the
    // successful parse so the authority executor receives its real contract.
    const parsed = GameplayOperatorInputSchema.parse(rawInput) as unknown as GenkitGameplayOperatorRequest;
    return executeGenkitGameplayAction(parsed);
  },
);
