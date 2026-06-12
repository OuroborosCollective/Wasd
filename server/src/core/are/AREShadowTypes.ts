import type { TickId } from "./types.js";
import type { AREReplayBuffer } from "./AREReplayBuffer.js";
import type { ThoughtState as PlayerThoughtState } from "../../modules/player/PlayerTypes.js";

export interface AREShadowTickInput {
  readonly entityId: string;
  readonly position?: unknown;
  readonly velocity?: unknown;
  readonly tick: TickId;
  readonly buffer: AREReplayBuffer;
  readonly payload?: unknown;
}

export interface AREShadowTickResult {
  readonly skipped: boolean;
  readonly recorded: boolean;
  readonly stateHash?: string;
  readonly error?: unknown;
}

export type ThoughtState = PlayerThoughtState;
