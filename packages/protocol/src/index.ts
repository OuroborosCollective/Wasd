/**
 * Network protocol types - stub for DeviceTier and other protocol definitions
 * NOTE: This is a placeholder - proper types should be consolidated from @wasd/shared or @wasd/types
 */
export type DeviceTier = 'mobile' | 'desktop' | 'tablet' | 'console';

export interface ProtocolConfig {
  version: string;
  deviceTier: DeviceTier;
}

export function createProtocolConfig(tier: DeviceTier): ProtocolConfig {
  return { version: '1.0.0', deviceTier: tier };
}
