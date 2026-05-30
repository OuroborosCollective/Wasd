/**
 * Core type definitions for Areloria/Ouroboros
 */

/**
 * Base ID type for entities
 */
export type BaseId = string | number;

/**
 * Device tier for client capabilities
 */
export type DeviceTier = 'mobile' | 'desktop' | 'tablet' | 'console';

/**
 * Network protocol configuration
 */
export interface ProtocolConfig {
  version: string;
  deviceTier: DeviceTier;
}

/**
 * Create protocol configuration
 */
export function createProtocolConfig(tier: DeviceTier): ProtocolConfig {
  return { version: '1.0.0', deviceTier: tier };
}

/**
 * AREPayload interface for deterministic simulation data
 */
export interface AREVector3 {
  x: number;
  y: number;
  z: number;
}

export type AREPayloadValue = string | boolean | null | number | AREPayloadValue[] | { readonly [key: string]: AREPayloadValue };

export interface AREPayload {
  readonly entityId: string;
  readonly position: Readonly<AREVector3>;
  readonly velocity: Readonly<AREVector3>;
  readonly stateHash?: number;
  readonly [key: string]: AREPayloadValue | Readonly<AREVector3> | undefined;
}
