/**
 * Core type definitions for Arelorian/Ouroboros
 */

/**
 * Base ID type for entities
 */
export type BaseId = string | number;

/**
 * Device tier for client capabilities
 */
export enum DeviceTier {
  LOW = 'low',
  MOBILE = 'mobile',
  STANDARD = 'standard',
  HIGH = 'high',
  ULTRA = 'ultra'
}

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

export interface AREPayload {
  timestamp: number;
  entities: any[];
  worldHash: string;
}
