/**
 * AREShadowAdapter - Shadow-Tick Integration
 *
 * Feeds deterministic tick output into shadow telemetry and replay side channels.
 */

import { createHash } from "node:crypto";
import type { TickId } from "./types.js";
import type { AREShadowTickInput, AREShadowTickResult, ThoughtState } from "./AREShadowTypes.js";
import { ARE_CONFIG } from "./AREConfig.js";
import { AREShadowLogSink } from "./AREShadowLogSink.js";

function stableHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export class AREShadowAdapter {
  private static readonly logSink = new AREShadowLogSink();
  private static initializationTick: TickId | null = null;

  static getLogSink(): AREShadowLogSink {
    return this.logSink;
  }

  static getEcosystemTelemetry(): Record<string, unknown> {
    return {
      deterministic: true,
      shadowTickEnabled: ARE_CONFIG.ENABLE_SHADOW_TICK,
    };
  }

  static writeShadowLog(input: AREShadowTickInput, stateHash?: string): void {
    const stats = {
      tick: input.tick,
      entityId: input.entityId,
      latestStateHash: stateHash ?? null,
      ecosystem: this.getEcosystemTelemetry(),
    };

    console.log(`[AREShadowAdapter] Write shadow log: tick=${input.tick}, entity=${input.entityId}, stateHash=${stateHash}`);
    this.logSink.write(input.tick, stats as any);
  }

  /**
   * routeThoughtStateLog - Route autonomous player ThoughtState to shadow log stream.
   *
   * Called by AutonomousPlayerTickSystem every 50 ticks when generating thinking logs.
   * Routes the thought state out of the main tick loop for external research sync.
   */
  static routeThoughtStateLog(thoughtState: ThoughtState, researchExportPath?: string): void {
    const tick = thoughtState.tick;

    const researchEnvelope = {
      type: "AUTONOMOUS_PLAYER_THOUGHT_STATE",
      version: "1.0",
      entityId: thoughtState.entityId,
      tick,
      thoughtState,
      exportPath: researchExportPath ?? null,
      routedAtTick: tick,
      routedDeterministicHash: stableHash(`${thoughtState.entityId}:${tick}:${thoughtState.decision.action}`),
      ecosystem: this.getEcosystemTelemetry(),
    };

    console.log(`[AREShadowAdapter] ThoughtState logged: entity=${thoughtState.entityId} tick=${tick} action=${thoughtState.decision.action}`);
    console.log(`[AREShadowAdapter] Utility Scores: combat=${thoughtState.utilityScores.combatScore} diplomacy=${thoughtState.utilityScores.diplomacyScore} flee=${thoughtState.utilityScores.fleeScore}`);
    console.log(`[AREShadowAdapter] Decision: ${thoughtState.decision.reasoning}`);

    this.logSink.write(tick, researchEnvelope as any);

    if (researchExportPath) {
      console.log(`[AREShadowAdapter] Marked for research export: ${researchExportPath}`);
    }
  }

  static executeShadowTick(input: AREShadowTickInput): AREShadowTickResult {
    if (!ARE_CONFIG.ENABLE_SHADOW_TICK) {
      return { skipped: true, recorded: false };
    }

    if (this.initializationTick === null) {
      this.initializationTick = input.tick;
      console.log(`[AREShadowAdapter] Adapter initialized at tick=${input.tick}, BufferCap=${input.buffer.capacity}`);
    }

    const stateHash = stableHash(`${input.tick}:${input.entityId}:${JSON.stringify(input.payload ?? {})}`);
    this.writeShadowLog(input, stateHash);

    return {
      skipped: false,
      recorded: true,
      stateHash,
    };
  }
}
