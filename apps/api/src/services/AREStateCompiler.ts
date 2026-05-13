/**
 * Arelorian WASD Infrastructure - AREStateCompiler
 * Part of the OuroborosCollective / Axiomatic Engine
 * 
 * This service handles the serialization of high-dimensional Kappa-space states
 * into binary payloads for the 10-Hz world tick. 
 * 
 * Enforces 1000-base integer scaling (Kappa) and deterministic state generation.
 */

import { PrismaClient, Prisma } from '@prisma/client';

export { PrismaClient, Prisma };

/**
 * AREStateData
 * Represents the fundamental atomic state of an entity within the ARE.
 */
export interface AREStateData {
  /** Logic Index (l) - The unique identifier */
  l: number;
  /** Kappa-space coordinates (k) - Fixed-point spatial positioning (val * 1000) */
  k: Int32Array;
  /** Resonance values (r) - Energetic frequency signatures */
  r: Float32Array;
}

export class AREStateCompiler {
  private static readonly TAG = "[AREStateCompiler]";
  private static readonly KAPPA_SCALE = 1000;

  /**
   * Enforces kappaPos integer scaling for raw coordinate values.
   * @param val Floating point coordinate
   * @returns Scaled integer
   */
  public static toKappa(val: number): number {
    return Math.floor(val * this.KAPPA_SCALE);
  }

  /**
   * Generates deterministic resonance values based on the current world tick.
   * Replaces non-deterministic Math.random() to ensure state consistency across nodes.
   * Uses a Linear Congruential Generator (LCG) logic for O(1) derivation.
   */
  public static getDeterministicResonance(tick: number, entityId: number): number {
    const seed = (tick * 15485863) ^ (entityId * 2038074743);
    return (seed % 10000) / 10000;
  }

  /**
   * Compiles states into binary payload.
   * Ensures all Kappa values are pre-processed for 10-Hz synchronization.
   */
  public static compile(states: AREStateData[]): Uint8Array {
    try {
      if (!Array.isArray(states)) {
        throw new Error("Invalid input: States must be an array.");
      }

      let totalByteLength = 4; // Header: Entity Count

      for (let i = 0; i < states.length; i++) {
        const state = states[i];
        if (!state || !(state.k instanceof Int32Array) || !(state.r instanceof Float32Array)) {
          continue; 
        }
        
        totalByteLength += 12; // Metadata: l (4), k_len (4), r_len (4)
        totalByteLength += state.k.byteLength;
        totalByteLength += state.r.byteLength;
      }

      const buffer = new ArrayBuffer(totalByteLength);
      const view = new DataView(buffer);
      const uint8Wrapper = new Uint8Array(buffer);
      
      let offset = 0;
      view.setUint32(offset, states.length, true);
      offset += 4;

      for (let i = 0; i < states.length; i++) {
        const state = states[i];
        if (!state) continue;

        view.setUint32(offset, state.l, true);
        offset += 4;
        view.setUint32(offset, state.k.length, true);
        offset += 4;
        view.setUint32(offset, state.r.length, true);
        offset += 4;

        const kBytes = new Uint8Array(state.k.buffer, state.k.byteOffset, state.k.byteLength);
        uint8Wrapper.set(kBytes, offset);
        offset += state.k.byteLength;

        const rBytes = new Uint8Array(state.r.buffer, state.r.byteOffset, state.r.byteLength);
        uint8Wrapper.set(rBytes, offset);
        offset += state.r.byteLength;
      }

      return uint8Wrapper;
    } catch (error) {
      console.error(`${this.TAG} CRITICAL: State compilation failed.`, error);
      return new Uint8Array(0);
    }
  }

  /**
   * Decompiles binary payload into structured state data with O(1) lookup compatibility.
   */
  public static decompile(payload: Uint8Array): AREStateData[] {
    try {
      if (!payload || payload.length < 4) return [];

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      let offset = 0;

      const count = view.getUint32(offset, true);
      offset += 4;

      const results: AREStateData[] = [];

      for (let i = 0; i < count; i++) {
        if (offset + 12 > payload.byteLength) break;

        const l = view.getUint32(offset, true);
        offset += 4;
        const kLen = view.getUint32(offset, true);
        offset += 4;
        const rLen = view.getUint32(offset, true);
        offset += 4;

        const kByteLen = kLen * 4;
        const rByteLen = rLen * 4;

        if (offset + kByteLen + rByteLen > payload.byteLength) break;

        const k = new Int32Array(payload.buffer.slice(payload.byteOffset + offset, payload.byteOffset + offset + kByteLen));
        offset += kByteLen;

        const r = new Float32Array(payload.buffer.slice(payload.byteOffset + offset, payload.byteOffset + offset + rByteLen));
        offset += rByteLen;

        results.push({ l, k, r });
      }

      return results;
    } catch (error) {
      console.error(`${this.TAG} CRITICAL: Decompilation failed.`, error);
      return [];
    }
  }
}