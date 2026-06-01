/**
 * Client Manifest System
 * 
 * Zero-Trust manifest verification with input lockdown.
 * Provides divergence detection, auto-resync, and blocking UI.
 */

// Core Tracker
export {
  ClientManifestTracker,
  clientManifestTracker,
  isLikelyValidManifest,
  parseWorldTickManifest,
  type ClientManifestState,
  type ManifestVerificationResult,
  type DivergenceConfig,
} from './ClientManifestTracker.js';

// Zero-Trust Manifest System with Input Lockdown
export {
  useZeroTrustManifest,
  useInputLocked,
  withInputLock,
  InputLockProvider,
  type UseManifestResult,
  type UseManifestOptions,
} from './useZeroTrustManifest.js';

// Divergence Alert UI (Panzerschrank Design)
export { DivergenceAlert } from './ui/DivergenceAlert.js';
export type { DivergenceAlertProps } from './ui/DivergenceAlert.js';