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
