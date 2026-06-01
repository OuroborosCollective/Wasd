/**
 * Client Manifest System
 * 
 * Exports for client-side manifest verification and divergence handling.
 */

// Re-export types for client use (subset of server types)
export type {
  ManifestKind,
  PayloadMode,
  DependencyKind,
  IDivergenceReport,
  GlobalStateManifest,
} from '../../server/src/core/manifest/ManifestTypes.js';

export {
  ClientManifestTracker,
  clientManifestTracker,
  isLikelyValidManifest,
  parseWorldTickManifest,
  type ClientManifestState,
  type ManifestVerificationResult,
  type DivergenceConfig,
} from './ClientManifestTracker.js';