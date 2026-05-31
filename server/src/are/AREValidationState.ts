import type { AREInvariantGuardStatus, DeterminismViolationDetail } from "./AREInvariantGuard.js";
import type { WorldHashSnapshot } from "./WorldHashSnapshot.js";

export interface AREValidationStateSnapshot {
  guard: AREInvariantGuardStatus | null;
  world: WorldHashSnapshot | null;
  fireGlitch: boolean;
  lastViolation: DeterminismViolationDetail | null;
  updatedAtIso: string;
}

const emptyState: AREValidationStateSnapshot = {
  guard: null,
  world: null,
  fireGlitch: false,
  lastViolation: null,
  updatedAtIso: new Date(0).toISOString(), // @are-telemetry-side-channel
};

class AREValidationStateStore {
  private state: AREValidationStateSnapshot = emptyState;

  updateGuard(guard: AREInvariantGuardStatus): AREValidationStateSnapshot {
    const lastViolation = guard.violations.at(-1) ?? null;
    this.state = {
      ...this.state,
      guard,
      fireGlitch: !guard.ok,
      lastViolation,
      updatedAtIso: new Date().toISOString(), // @are-telemetry-side-channel
    };
    return this.getSnapshot();
  }

  updateWorld(world: WorldHashSnapshot): AREValidationStateSnapshot {
    this.state = {
      ...this.state,
      world,
      updatedAtIso: new Date().toISOString(), // @are-telemetry-side-channel
    };
    return this.getSnapshot();
  }

  getSnapshot(): AREValidationStateSnapshot {
    return {
      ...this.state,
      guard: this.state.guard ? { ...this.state.guard, violations: [...this.state.guard.violations], checkedCorePaths: [...this.state.guard.checkedCorePaths] } : null,
      world: this.state.world ? { ...this.state.world, chunks: [...this.state.world.chunks] } : null,
      lastViolation: this.state.lastViolation ? { ...this.state.lastViolation } : null,
    };
  }
}

export const areValidationState = new AREValidationStateStore();
