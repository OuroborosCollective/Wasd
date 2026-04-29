export interface AREWeighting {
  primary: number;
  secondary: number;
  tertiary: number;
}

/**
 * Serialisiert die ARE-Gewichtung (45/35/20) in einen 12-Byte Binary Buffer.
 * Verwendet Little-Endian Float32 für maximale Performance und Präzision.
 */
export function serializeAREWeighting(weighting: AREWeighting): Uint8Array {
  const buffer = new Uint8Array(12);
  const view = new DataView(buffer.buffer);
  
  view.setFloat32(0, weighting.primary, true);   // Bias 45%
  view.setFloat32(4, weighting.secondary, true); // Bias 35%
  view.setFloat32(8, weighting.tertiary, true);  // Bias 20%
  
  return buffer;
}

/**
 * Deserialisiert einen Binary Buffer zurück in ein AREWeighting Objekt.
 */
export function deserializeAREWeighting(buffer: Uint8Array): AREWeighting {
  if (buffer.byteLength < 12) {
    throw new Error("InvalidAREBufferLength");
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  return {
    primary: view.getFloat32(0, true),
    secondary: view.getFloat32(4, true),
    tertiary: view.getFloat32(8, true)
  };
}

/**
 * Optimierte Batch-Serialisierung für ARE-Datenströme.
 */
export function serializeAREStream(weightings: AREWeighting[]): Uint8Array {
  const streamBuffer = new Uint8Array(weightings.length * 12);
  const view = new DataView(streamBuffer.buffer);
  
  for (let i = 0; i < weightings.length; i++) {
    const offset = i * 12;
    view.setFloat32(offset, weightings[i].primary, true);
    view.setFloat32(offset + 4, weightings[i].secondary, true);
    view.setFloat32(offset + 8, weightings[i].tertiary, true);
  }
  
  return streamBuffer;
}

/**
 * Optimierte Batch-Deserialisierung für ARE-Datenströme.
 */
export function deserializeAREStream(buffer: Uint8Array): AREWeighting[] {
  const count = buffer.byteLength / 12;
  const result: AREWeighting[] = new Array(count);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  
  for (let i = 0; i < count; i++) {
    const offset = i * 12;
    result[i] = {
      primary: view.getFloat32(offset, true),
      secondary: view.getFloat32(offset + 4, true),
      tertiary: view.getFloat32(offset + 8, true)
    };
  }
  
  return result;
}