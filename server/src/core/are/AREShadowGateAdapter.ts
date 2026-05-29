/**
 * AREShadowGateAdapter.ts
 *
 * Bridges the ARE Shadow State with the rest of the game world.
 * Detects "Shadow Echoes" (entropy spikes) that manifest as reality thinning.
 */

import { type IAREPayload } from './AREPayload';
import { ARE_CONFIG } from './AREConfig';

export interface ShadowEcho {
  tick: number;
  intensity: number;
  origin: { x: number, y: number, z: number };
  entityId: string;
  divergenceType: 'drift' | 'entropy';
}

export type EchoListener = (echo: ShadowEcho) => void;

export class AREShadowGateAdapter {
  private static listeners: EchoListener[] = [];

  static subscribe(listener: EchoListener): void {
    this.listeners.push(listener);
  }

  /**
   * Called by AREShadowAdapter when a significant entropy event occurs.
   */
  static notifyEntropySpike(tick: number, payload: Readonly<IAREPayload>, driftIntensity: number): void {
    if (!ARE_CONFIG.ENABLE_SHADOW_TICK) return;

    // Only notify for significant spikes
    if (driftIntensity < 5000) return;

    const echo: ShadowEcho = {
      tick,
      intensity: Math.min(1.0, driftIntensity / 20000),
      origin: {
        x: Number(payload.position?.x ?? 0),
        y: Number(payload.position?.y ?? 0),
        z: Number(payload.position?.z ?? 0)
      },
      entityId: payload.entityId,
      divergenceType: 'drift'
    };

    this.broadcast(echo);
  }

  private static broadcast(echo: ShadowEcho): void {
    for (const listener of this.listeners) {
      try {
        listener(echo);
      } catch (err) {
        // Silently catch listener errors to preserve core stability
      }
    }
  }
}
