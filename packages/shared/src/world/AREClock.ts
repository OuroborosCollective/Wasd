import { assertInteger, intDiv } from "./KappaMath";

export const ARE_TICKS_PER_SECOND = 10 as const;

export type ARETick = number & { readonly __brand: "ARETick" };

export function toARETick(value: number): ARETick {
  assertInteger(value, "ARE tick");
  if (value < 0) throw new Error("ARE tick cannot be negative");
  return value as ARETick;
}

export function secondsToTicks(seconds: number): ARETick {
  assertInteger(seconds, "seconds");
  if (seconds < 0) throw new Error("seconds cannot be negative");
  return toARETick(seconds * ARE_TICKS_PER_SECOND);
}

export function ticksToSeconds(tick: ARETick): number {
  return intDiv(tick, ARE_TICKS_PER_SECOND);
}

export function cyclePhase(tick: ARETick, cycleTicks: ARETick): number {
  assertInteger(tick, "tick");
  assertInteger(cycleTicks, "cycleTicks");
  if (cycleTicks <= 0) throw new Error("cycleTicks must be positive");
  return tick % cycleTicks;
}
