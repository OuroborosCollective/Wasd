/**
 * GlobalStateManifest System
 * 
 * A deterministic, server-authoritative manifest protocol for Areloria.
 * 
 * Design principle: Manifest klein halten, Funktionen drumherum stark machen.
 * 
 * Core modules:
 * - ManifestTypes: Type definitions (data container only)
 * - ManifestCanonicalizer: Deterministic string conversion
 * - ManifestHasher: SHA256 hashing utilities
 * - ManifestSigner: HMAC signing
 * - ManifestVerifier: Validation logic
 * - ManifestReplayGuard: Replay attack prevention
 * - ManifestFactory: Manifest creation with auto-hashing/signing
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export {
  GENESIS_STATE_HASH,
  GENESIS_PREVIOUS_HASH,
  type ManifestKind,
  type PayloadMode,
  type DependencyKind,
  type SignatureAlgorithm,
  type ICryptoDependencyHeader,
  type IManifestDependency,
  type ISelfHealManifestMeta,
  type IClientInputManifest,
  type IDivergenceReport,
  type IManifestBody,
  type GlobalStateManifest,
  type IReplayGuardState,
  type IChainValidationResult,
  type ManifestFactoryOptions,
} from './ManifestTypes.js';

// ─── Core Logic ───────────────────────────────────────────────────────────────

export {
  toCanonicalString,
  canonicalizeHeader,
  canonicalizeDependency,
  canonicalizeDependencyRoot,
  canonicalizeBody,
  canonicalizeSelfHeal,
  canonicalizeDivergence,
  canonicalizeManifest,
  hashPayload,
} from './ManifestCanonicalizer.js';

export {
  sha256,
  sha256Buffer,
  sha256Combine,
  merkleRoot,
  computeDependencyRoot,
  hashPayload as hashPayloadFromHasher,
  hashIdentity,
  verifyHash,
  generateNonce,
  hashManifestBody,
} from './ManifestHasher.js';

export {
  signHeader,
  signStateHash,
  verifySignature,
  deriveSigningKey,
  signWithKey,
  verifyWithKey,
  signManifestChain,
  signTickManifest,
  type SigningOptions,
} from './ManifestSigner.js';

export {
  verifyManifest,
  verifyHeaderConstraints,
  verifyDependencies,
  validateChain,
  isLikelyValid,
  type VerificationResult,
} from './ManifestVerifier.js';

export {
  ManifestReplayGuard,
  globalReplayGuard,
} from './ManifestReplayGuard.js';

export {
  ManifestFactory,
  createManifestFactory,
  createTickManifest,
  type CreateManifestOptions,
} from './ManifestFactory.js';

export {
  WorldTickManifestManager,
  createWorldTickManifestManager,
  type WorldTickManifestConfig,
  type WorldTickDependencySources,
} from './WorldTickManifestManager.js';