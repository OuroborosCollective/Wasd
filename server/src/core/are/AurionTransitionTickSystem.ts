import { aurionTransitionRuntime, type AurionTransitionRuntime } from "../../aurion/AurionTransitionRuntime.js";
import { TickSystemPriority, type TickSystem, type TickSystemContext } from "./TickSystem.js";
import { tickSystemRegistry, type TickSystemRegistry } from "./TickSystemRegistry.js";

export const AURION_TRANSITION_TICK_SYSTEM_NAME = "aurion-transition" as const;

/**
 * Applies previously validated Aurion requests on the deterministic game tick.
 * The router only enqueues requests; this system is the sole state-mutation path.
 */
export class AurionTransitionTickSystem implements TickSystem {
  readonly id = AURION_TRANSITION_TICK_SYSTEM_NAME;
  readonly name = AURION_TRANSITION_TICK_SYSTEM_NAME;
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  constructor(private readonly runtime: AurionTransitionRuntime = aurionTransitionRuntime) {}

  tick(context: TickSystemContext): void {
    const tick = Number(context.tickCount);
    if (!Number.isSafeInteger(tick) || tick < 0) return;
    this.runtime.applyReadyTransitions(tick);
  }
}

export function registerAurionTransitionTickSystem(
  runtime: AurionTransitionRuntime = aurionTransitionRuntime,
  registry: TickSystemRegistry = tickSystemRegistry,
): AurionTransitionTickSystem {
  const existing = registry.get(AURION_TRANSITION_TICK_SYSTEM_NAME);
  if (existing instanceof AurionTransitionTickSystem) return existing;

  const system = new AurionTransitionTickSystem(runtime);
  registry.register({
    system,
    dependencies: [],
    tags: ["aurion", "gameplay", "transition"],
  });
  return system;
}
