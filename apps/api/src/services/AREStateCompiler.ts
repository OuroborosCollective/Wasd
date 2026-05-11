/**
 * Arelorian WASD Infrastructure - AREStateCompiler
 * Part of the OuroborosCollective / Axiomatic Engine
 * 
 * This service handles the serialization of high-dimensional Kappa-space states
 * into binary payloads for the 10-Hz world tick. 
 * 
 * It also acts as a bridge for Prisma exports to ensure type consistency 
 * across API services and prevent TS2305 build errors.
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Aliasing / Re-exporting Prisma members to resolve TS2305 and ensure 
// the AxiomValidationLayer has a stable reference to the persistence types.
export { PrismaClient, Prisma };

/**
 * AREStateData
 * Represents the fundamental atomic state of an entity within the ARE (Axiomatic Reality Engine).
 */
export interface AREStateData {
  /** Logic Index (l) - The unique identifier for the axiomatic logic processor */
  l: number;
  /** Kappa-space coordinates (k) - Fixed-point spatial positioning (Kappa=1000) */
  k: Int32Array;
  /** Resonance values (r) - Energetic frequency or magnitude signatures */
  r: Float32Array;
}

/**
 * AREStateCompiler
 * Aggregates logic indices, kappa-space coordinates, and resonance values
 * into a minimal, immutable binary payload for authoritative server broadcast.
 * 
 * Optimized for Axiomatic Event reconstruction within the 100ms WorldTick.
 * 
 * Format:
 * [4 bytes] Entity Count (N)
 * --- For each entity (1..N) ---
 * [4 bytes] Logic Index (l)
 * [4 bytes] Kappa Length (k_len)
 * [4 bytes] Resonance Length (r_len)
 * [k_len * 4 bytes] Kappa Data (Int32, Fixed-Point)
 * [r_len * 4 bytes] Resonance Data (Float32)
 */
export class AREStateCompiler {
  private static readonly TAG = "[AREStateCompiler]";

  /**
   * Compiles an array of state data into a single binary payload.
   * Uses Fixed-Point Math (Kappa) compatibility for deterministic state calculation.
   * 
   * @param states Array of AREStateData objects.
   * @returns Uint8Array containing the packed binary data.
   */
  public static compile(states: AREStateData[]): Uint8Array {
    try {
      if (!Array.isArray(states)) {
        throw new Error("Invalid input: States must be an array.");
      }

      let totalByteLength = 4; // Initial Header: Entity Count (uint32)

      // Step 1: Pre-calculate size and validate data integrity (Deterministic verification)
      for (let i = 0; i < states.length; i++) {
        const state = states[i];
        if (!state) {
          throw new Error(`State at index ${i} is null or undefined.`);
        }
        if (!(state.k instanceof Int32Array) || !(state.r instanceof Float32Array)) {
          throw new Error(`Invalid data types at index ${i}. Expected TypedArrays for Kappa/Resonance.`);
        }
        
        totalByteLength += 12; // Metadata: l (4), k_len (4), r_len (4)
        totalByteLength += state.k.byteLength;
        totalByteLength += state.r.byteLength;
      }

      const buffer = new ArrayBuffer(totalByteLength);
      const view = new DataView(buffer);
      const uint8Wrapper = new Uint8Array(buffer);
      
      let offset = 0;

      // Step 2: Write Entity Count
      view.setUint32(offset, states.length, true);
      offset += 4;

      // Step 3: Write Entity Data
      for (let i = 0; i < states.length; i++) {
        const state = states[i];

        // Write Metadata (Logic ID and Lengths)
        view.setUint32(offset, state.l, true);
        offset += 4;
        view.setUint32(offset, state.k.length, true);
        offset += 4;
        view.setUint32(offset, state.r.length, true);
        offset += 4;

        // Copy Kappa Data (Int32Array) - Preserving 1000-base fixed point
        const kBytes = new Uint8Array(
          state.k.buffer,
          state.k.byteOffset,
          state.k.byteLength
        );
        uint8Wrapper.set(kBytes, offset);
        offset += state.k.byteLength;

        // Copy Resonance Data (Float32Array)
        const rBytes = new Uint8Array(
          state.r.buffer,
          state.r.byteOffset,
          state.r.byteLength
        );
        uint8Wrapper.set(rBytes, offset);
        offset += state.r.byteLength;
      }

      return uint8Wrapper;
    } catch (error) {
      console.error(`${this.TAG} CRITICAL: State compilation failed for Axiomatic Events.`, {
        error: error instanceof Error ? error.message : "Unknown Error",
        stack: error instanceof Error ? error.stack : undefined,
        entityCount: states?.length
      });
      // Return empty buffer to ensure the 10Hz tick continues without catastrophic failure
      return new Uint8Array(0);
    }
  }

  /**
   * Decompiles binary payload into structured state data.
   * Performs rigorous boundary checks to satisfy AxiomValidationLayer requirements.
   * 
   * @param payload The binary Uint8Array received from the network/buffer.
   * @returns Array of AREStateData objects.
   */
  public static decompile(payload: Uint8Array): AREStateData[] {
    try {
      if (!payload || payload.length < 4) {
        if (payload && payload.length > 0) {
          throw new Error("Payload too short to contain header.");
        }
        return [];
      }

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      let offset = 0;

      const count = view.getUint32(offset, true);
      offset += 4;

      const results: AREStateData[] = [];

      for (let i = 0; i < count; i++) {
        // Bounds check for Metadata (3x4 bytes: l, kLen, rLen)
        if (offset + 12 > payload.byteLength) {
          throw new Error(`Buffer overflow: Metadata for entity ${i} exceeds payload length.`);
        }

        const l = view.getUint32(offset, true);
        offset += 4;
        const kLen = view.getUint32(offset, true);
        offset += 4;
        const rLen = view.getUint32(offset, true);
        offset += 4;

        const kByteLen = kLen * 4;
        const rByteLen = rLen * 4;

        // Bounds check for Data segments to prevent memory corruption
        if (offset + kByteLen + rByteLen > payload.byteLength) {
          throw new Error(`Buffer overflow: Data for entity ${i} (Logic: ${l}) exceeds remaining payload.`);
        }

        // Extract Kappa Data (Int32Array) using buffer slice for isolation within the tick
        const k = new Int32Array(
          payload.buffer.slice(
            payload.byteOffset + offset,
            payload.byteOffset + offset + kByteLen
          )
        );
        offset += kByteLen;

        // Extract Resonance Data (Float32Array)
        const r = new Float32Array(
          payload.buffer.slice(
            payload.byteOffset + offset,
            payload.byteOffset + offset + rByteLen
          )
        );
        offset += rByteLen;

        results.push({ l, k, r });
      }

      return results;
    } catch (error) {
      console.error(`${this.TAG} CRITICAL: State decompilation failed. Axiomatic state might be corrupted.`, {
        error: error instanceof Error ? error.message : "Unknown Error",
        payloadSize: payload?.byteLength,
        offset: "Decompilation interrupted"
      });
      return [];
    }
  }
}