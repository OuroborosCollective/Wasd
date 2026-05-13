/**
 * AtmosphericResonanceBridge - Stateless Visual Feedback System
 * 
 * Visualizes social temperature of 64x64 chunks from deterministic AREPayload.
 * Extracts resonance, phaseShift, and aggression_avg from chain-string.
 * 
 * Formula: pulse = Math.sin(timeScale + phaseShift) * resonance
 * Amplifies emissiveIntensity based on aggression value.
 * 
 * Features:
 * - No separate animation packages from server
 * - Chain-string extraction for deterministic state
 * - Bio-luminescent resonance pulse
 * - Emissive intensity amplification
 * - Stateless visuals (client-only rendering)
 */

import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

/** Engine time tracker */
export class EngineTime {
  private static readonly startTime: number = typeof performance !== 'undefined' ? performance.now() : Date.now();

  public static getElapsedTime(): number {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return (now - this.startTime) / 1000;
  }
}

/** Culling system for visible chunks */
export class CullingSystem {
  private visibleChunks: Set<string> = new Set();

  public isChunkVisible(chunkId: string): boolean {
    return this.visibleChunks.has(chunkId);
  }

  public registerVisibility(chunkId: string, isVisible: boolean): void {
    if (isVisible) {
      this.visibleChunks.add(chunkId);
    } else {
      this.visibleChunks.delete(chunkId);
    }
  }
}

/** ARE Payload extracted from chain-string */
export interface AREPayload {
  resonance: number;
  phaseShift: number;
  traits: {
    aggression_avg: number;
    faith_avg: number;
  };
  chain: string;
  timestamp: number;
}

/** Resonance data for rendering */
export interface ResonanceData {
  aggression: number;
  frequency: number;
  amplitude: number;
  phaseShift: number;
  resonance: number;
  position: { x: number; y: number; z: number };
  mesh?: Mesh;
  material?: StandardMaterial;
}

/** Chain string parser */
export class ChainStringParser {
  /**
   * Extract AREPayload from chain-string.
   * Format: "resonance|phaseShift|aggression_avg|faith_avg|timestamp"
   */
  public static parseChainString(chain: string): AREPayload | null {
    if (!chain || chain.length === 0) {
      return null;
    }

    try {
      const parts = chain.split('|');
      if (parts.length < 4) {
        return null;
      }

      return {
        resonance: parseFloat(parts[0]) || 0,
        phaseShift: parseFloat(parts[1]) || 0,
        traits: {
          aggression_avg: parseFloat(parts[2]) || 0,
          faith_avg: parseFloat(parts[3]) || 0
        },
        chain,
        timestamp: parseInt(parts[4]) || Date.now()
      };
    } catch {
      return null;
    }
  }

  /**
   * Validate chain integrity.
   */
  public static validateChain(chain: string): boolean {
    if (!chain || chain.length < 10) return false;
    const parts = chain.split('|');
    return parts.length >= 4;
  }
}

/** Pulse calculator */
export class PulseCalculator {
  /**
   * Calculate pulse based on formula:
   * pulse = Math.sin(timeScale + phaseShift) * resonance
   */
  public static calculate(
    timeScale: number,
    phaseShift: number,
    resonance: number
  ): number {
    return Math.sin(timeScale + phaseShift) * resonance;
  }

  /**
   * Calculate emissive intensity based on aggression.
   * Higher aggression = higher intensity.
   */
  public static calculateEmissive(
    aggression: number,
    baseIntensity: number = 0.5
  ): number {
    const amplified = baseIntensity + (aggression * 1.5);
    return Math.min(2.0, amplified);
  }

  /**
   * Calculate color based on aggression/faith ratio.
   */
  public static calculateColor(
    aggression: number,
    faith: number
  ): Color3 {
    const r = Math.min(1, aggression * 2);
    const g = 0.1;
    const b = Math.min(1, faith * 2);
    return new Color3(r, g, b);
  }
}

/** Main AtmosphericResonanceBridge class */
export class AtmosphericResonanceBridge {
  private static instance: AtmosphericResonanceBridge;
  private currentIntensity: number = 0;
  private targetIntensity: number = 0;
  private readonly LERP_SPEED: number = 0.12;
  private readonly TIME_SCALE: number = 2.0;

  private activeResonances: Map<string, ResonanceData> = new Map();
  private cullingSystem: CullingSystem;

  private constructor(cullingSystem: CullingSystem) {
    this.cullingSystem = cullingSystem;
  }

  public static getInstance(cullingSystem: CullingSystem): AtmosphericResonanceBridge {
    if (!AtmosphericResonanceBridge.instance) {
      AtmosphericResonanceBridge.instance = new AtmosphericResonanceBridge(cullingSystem);
    }
    return AtmosphericResonanceBridge.instance;
  }

  /**
   * Handle incoming AREPayload from chain-string.
   * Extracts resonance, phaseShift, and aggression_avg.
   */
  public handleIncomingPayload(chunkId: string, payload: AREPayload): void {
    if (!payload || !ChainStringParser.validateChain(payload.chain)) {
      return;
    }

    const resonanceData: ResonanceData = {
      aggression: payload.traits.aggression_avg,
      frequency: 1.0 + (payload.resonance * 0.5),
      amplitude: payload.resonance,
      phaseShift: payload.phaseShift,
      resonance: payload.resonance,
      position: { x: 0, y: 0, z: 0 }
    };

    this.activeResonances.set(chunkId, resonanceData);
  }

  /**
   * Handle raw chain-string (auto-parse).
   */
  public handleChainString(chunkId: string, chain: string): void {
    const payload = ChainStringParser.parseChainString(chain);
    if (payload) {
      this.handleIncomingPayload(chunkId, payload);
    }
  }

  /**
   * Update all active resonances.
   * Uses: pulse = Math.sin(timeScale + phaseShift) * resonance
   * Amplifies emissive intensity based on aggression.
   */
  public update(): void {
    let aggregateAggression = 0;
    let activeCount = 0;

    const timeScale = EngineTime.getElapsedTime() * this.TIME_SCALE;

    this.activeResonances.forEach((data, chunkId) => {
      if (!this.cullingSystem.isChunkVisible(chunkId)) {
        return;
      }

      // Calculate pulse: sin(timeScale + phaseShift) * resonance
      const pulse = PulseCalculator.calculate(
        timeScale,
        data.phaseShift,
        data.resonance
      );

      // Calculate emissive intensity based on aggression
      const emissiveIntensity = PulseCalculator.calculateEmissive(
        data.aggression,
        0.5
      );

      // Update material if available
      if (data.material) {
        data.material.emissiveIntensity = emissiveIntensity;
        
        // Update color based on aggression/faith
        const color = PulseCalculator.calculateColor(data.aggression, 1 - data.aggression);
        data.material.emissiveColor = color;
      }

      // Aggregate for global intensity
      const peakIntensity = Math.pow(data.aggression, 2);
      aggregateAggression += peakIntensity * (0.5 + 0.5 * pulse) * data.amplitude;
      activeCount++;
    });

    this.targetIntensity = activeCount > 0 ? aggregateAggression / activeCount : 0;
    this.applyLerp();
  }

  private applyLerp(): void {
    const delta = this.targetIntensity - this.currentIntensity;
    if (Math.abs(delta) < 0.001) {
      this.currentIntensity = this.targetIntensity;
      return;
    }
    this.currentIntensity += delta * this.LERP_SPEED;
  }

  public getIntensity(): number {
    return this.currentIntensity;
  }

  public getChunkResonance(chunkId: string): ResonanceData | undefined {
    return this.activeResonances.get(chunkId);
  }

  public clearResonance(chunkId: string): void {
    const data = this.activeResonances.get(chunkId);
    if (data?.material) {
      data.material.dispose();
    }
    this.activeResonances.delete(chunkId);
  }

  public reset(): void {
    this.activeResonances.forEach((data) => {
      if (data.material) {
        data.material.dispose();
      }
    });
    this.activeResonances.clear();
    this.currentIntensity = 0;
    this.targetIntensity = 0;
  }

  public getActiveChunks(): string[] {
    return Array.from(this.activeResonances.keys());
  }
}

export default AtmosphericResonanceBridge;