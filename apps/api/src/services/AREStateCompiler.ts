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
   * @param states Array of AREStateData objects.
   * @returns Uint8Array containing the packed binary data.
   */
  public static compile(states: AREStateData[]): Uint8Array {
    let totalByteLength = 4; // Start with entity count header

    // Calculate total required size
    for (const state of states) {
      totalByteLength += 12; // 3 x uint32 (l, k_len, r_len)
      totalByteLength += state.k.byteLength;
      totalByteLength += state.r.byteLength;
    }

    const buffer = new ArrayBuffer(totalByteLength);
    const view = new DataView(buffer);
    const uint8Wrapper = new Uint8Array(buffer);
    
    let offset = 0;

    // Write entity count
    view.setUint32(offset, states.length, true);
    offset += 4;

    for (const state of states) {
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
   * Internal utility to parse the binary payload (useful for validation or client-side logic).
   */
  public static decompile(payload: Uint8Array): AREStateData[] {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    let offset = 0;

    const count = view.getUint32(offset, true);
    offset += 4;

    const results: AREStateData[] = [];

    for (let i = 0; i < count; i++) {
      const l = view.getUint32(offset, true);
      offset += 4;
      const kLen = view.getUint32(offset, true);
      offset += 4;
      const rLen = view.getUint32(offset, true);
      offset += 4;

      const k = new Int32Array(
        payload.buffer.slice(
          payload.byteOffset + offset,
          payload.byteOffset + offset + kLen * 4
        )
      );
      offset += kLen * 4;

      const r = new Float32Array(
        payload.buffer.slice(
          payload.byteOffset + offset,
          payload.byteOffset + offset + rLen * 4
        )
      );
      offset += rLen * 4;

      results.push({ l, k, r });
    }

    return results;
  }
}