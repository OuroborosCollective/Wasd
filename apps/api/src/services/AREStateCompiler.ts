import { AxiomaticEventBus } from '../events/AxiomaticEventBus';

export interface AREStateData {
  /** Logic Index (l) */
  l: number;
  /** Kappa-space coordinates (k) */
  k: Int32Array;
  /** Resonance values (r) */
  r: Float32Array;
}

/**
 * AREStateCompiler
 * Aggregates logic indices, kappa-space coordinates, and resonance values
 * into a minimal, immutable binary payload for authoritative server broadcast.
 * 
 * Format:
 * [4 bytes] Entity Count (N)
 * --- For each entity (1..N) ---
 * [4 bytes] Logic Index (l)
 * [4 bytes] Kappa Length (k_len)
 * [4 bytes] Resonance Length (r_len)
 * [k_len * 4 bytes] Kappa Data (Int32)
 * [r_len * 4 bytes] Resonance Data (Float32)
 */
export class AREStateCompiler {
  /**
   * Compiles an array of state data into a single binary payload.
   * Performs validation against mathematical singularities and corruption.
   * 
   * @param states Array of AREStateData objects.
   * @returns Uint8Array containing the packed binary data.
   */
  public static compile(states: AREStateData[]): Uint8Array {
    const validStates: AREStateData[] = [];
    let totalByteLength = 4; // Header: Entity count

    for (const state of states) {
      try {
        // 1. Structural Integrity Check
        if (!state || typeof state.l !== 'number' || !state.k || !state.r) {
          throw new Error(`Corrupt state structure detected for index ${state?.l ?? 'unknown'}`);
        }

        // 2. Mathematical Singularity Check (KappaMath Validation)
        // Check for NaN or Infinity in resonance values (r)
        let hasSingularity = false;
        for (let i = 0; i < state.r.length; i++) {
          if (!Number.isFinite(state.r[i]) || Number.isNaN(state.r[i])) {
            hasSingularity = true;
            break;
          }
        }

        if (hasSingularity) {
          AxiomaticEventBus.emit('compiler:singularity_detected', {
            logicIndex: state.l,
            resonanceData: Array.from(state.r),
            timestamp: Date.now()
          });
          continue; // Skip this entity but continue compilation
        }

        validStates.push(state);
        totalByteLength += 12; // 3 x uint32 (l, k_len, r_len)
        totalByteLength += state.k.byteLength;
        totalByteLength += state.r.byteLength;

      } catch (error) {
        AxiomaticEventBus.emit('compiler:state_error', {
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          state: state ? { l: state.l } : null
        });
      }
    }

    const buffer = new ArrayBuffer(totalByteLength);
    const view = new DataView(buffer);
    const uint8Wrapper = new Uint8Array(buffer);
    
    let offset = 0;

    // Write valid entity count
    view.setUint32(offset, validStates.length, true);
    offset += 4;

    for (const state of validStates) {
      // Write Metadata
      view.setUint32(offset, state.l, true);
      offset += 4;
      view.setUint32(offset, state.k.length, true);
      offset += 4;
      view.setUint32(offset, state.r.length, true);
      offset += 4;

      // Copy Kappa Data (Int32Array)
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
  }

  /**
   * Internal utility to parse the binary payload.
   * Robust against truncated or malformed buffers.
   */
  public static decompile(payload: Uint8Array): AREStateData[] {
    const results: AREStateData[] = [];
    
    try {
      if (payload.byteLength < 4) {
        throw new Error('Payload too short to contain entity count header');
      }

      const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      let offset = 0;

      const count = view.getUint32(offset, true);
      offset += 4;

      for (let i = 0; i < count; i++) {
        // Bounds check for metadata (3 * 4 bytes)
        if (offset + 12 > payload.byteLength) {
          throw new Error(`Unexpected EOF while reading metadata for entity ${i}`);
        }

        const l = view.getUint32(offset, true);
        offset += 4;
        const kLen = view.getUint32(offset, true);
        offset += 4;
        const rLen = view.getUint32(offset, true);
        offset += 4;

        const kByteSize = kLen * 4;
        const rByteSize = rLen * 4;

        // Bounds check for data segments
        if (offset + kByteSize + rByteSize > payload.byteLength) {
          throw new Error(`Data segment overflow for entity logic index ${l}`);
        }

        const k = new Int32Array(
          payload.buffer.slice(
            payload.byteOffset + offset,
            payload.byteOffset + offset + kByteSize
          )
        );
        offset += kByteSize;

        const r = new Float32Array(
          payload.buffer.slice(
            payload.byteOffset + offset,
            payload.byteOffset + offset + rByteSize
          )
        );
        offset += rByteSize;

        results.push({ l, k, r });
      }
    } catch (error) {
      AxiomaticEventBus.emit('compiler:decompilation_failure', {
        message: error instanceof Error ? error.message : 'Unknown decompilation error',
        payloadSize: payload.byteLength
      });
    }

    return results;
  }
}