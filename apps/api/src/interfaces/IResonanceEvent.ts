export enum ResonanceEventType {
  IMPACT = 'IMPACT',
  PULSE = 'PULSE',
  ANOMALY = 'ANOMALY',
  ATMOSPHERIC = 'ATMOSPHERIC',
  USER_ACTION = 'USER_ACTION',
  AI_INTERVENTION = 'AI_INTERVENTION',
  STABILITY_SHIFT = 'STABILITY_SHIFT'
}

/**
 * Interface for Resonance Grid events within the Areloria WASD ecosystem.
 * Defines spatial-temporal disturbances or signals that influence the 3D world state
 * and AI agent (Jules) decision-making logic.
 */
export interface IResonanceEvent {
  /** Unique identifier for the event instance */
  id: string;

  /** The classification of the resonance event */
  type: ResonanceEventType | string;

  /** Spatial coordinates on the 2D grid representation */
  coordinate: {
    x: number;
    y: number;
  };

  /** The magnitude of the event (0.0 to 1.0 or higher depending on scaling) */
  intensity: number;

  /** Optional radius of influence for spatial falloff calculations */
  radius?: number;

  /** Unix timestamp of when the event occurred or was recorded */
  timestamp: number;

  /** Optional source ID (e.g., Agent ID, User ID, or System Process) */
  sourceId?: string;

  /** Flexible metadata for extended event-specific data (e.g., color, frequency, payload) */
  metadata?: Record<string, any>;
}