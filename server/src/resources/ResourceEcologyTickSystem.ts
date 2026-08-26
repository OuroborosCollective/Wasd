import { TickSystemPriority, type TickSystem, type TickSystemContext } from "../core/are/TickSystem.js";
import { resourceEcologyService, type ResourceEcologyService } from "./ResourceEcologyService.js";

export const RESOURCE_ECOLOGY_TICK_SYSTEM_NAME = "resource-economy" as const;

export class ResourceEcologyTickSystem implements TickSystem {
  readonly id = RESOURCE_ECOLOGY_TICK_SYSTEM_NAME;
  readonly name = RESOURCE_ECOLOGY_TICK_SYSTEM_NAME;
  readonly priority = TickSystemPriority.GAMEPLAY;
  enabled = true;

  constructor(private readonly ecology: ResourceEcologyService = resourceEcologyService) {}

  tick(context: TickSystemContext): void {
    const tickCount = Number(context.tickCount);
    if (!Number.isSafeInteger(tickCount) || tickCount < 0) return;
    if (tickCount % this.ecology.getTickCadence() !== 0) return;
    this.ecology.tick(tickCount);
  }
}
