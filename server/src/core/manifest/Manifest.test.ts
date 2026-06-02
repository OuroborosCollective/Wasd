/**
 * Manifest System Tests
 * 
 * Basic tests to verify manifest system functionality.
 */

/// <reference types="vitest/globals" />

import {
  ManifestFactory,
  ManifestReplayGuard,
  verifyManifest,
  GENESIS_STATE_HASH,
  GENESIS_PREVIOUS_HASH,
  sha256,
  sha256Combine,
  toCanonicalString,
  isLikelyValid,
  type GlobalStateManifest,
  type IManifestDependency,
} from './index.js';

const WORLD_ID = 'test-world-1';
const AUTHORITY_SECRET = 'test-secret-key-for-signing';

describe('Manifest System', () => {
  let factory: ManifestFactory;
  let replayGuard: ManifestReplayGuard;

  beforeEach(() => {
    factory = new ManifestFactory({
      worldId: WORLD_ID,
      worldSeedHash: GENESIS_STATE_HASH,
      ruleSetHash: GENESIS_STATE_HASH,
      authoritySecret: AUTHORITY_SECRET,
      tickRateHz: 10,
    });
    replayGuard = new ManifestReplayGuard();
  });

  describe('ManifestFactory', () => {
    it('creates genesis manifest', () => {
      const genesis = factory.createGenesis();
      
      expect(genesis.header.tickSequence).toBe(0);
      expect(genesis.header.kind).toBe('snapshot');
      expect(genesis.header.previousStateHash).toBe(GENESIS_STATE_HASH);
      expect(genesis.header.stateHash.length).toBe(64);
    });

    it('creates delta tick manifest', () => {
      const tick = factory.createDeltaTick(100, { players: [], npcs: [] }, []);
      
      expect(tick.header.tickSequence).toBe(100);
      expect(tick.header.kind).toBe('world_tick');
      expect(tick.header.simulationTimeMs).toBe(10000); // 100 ticks * 100ms
    });

    it('creates snapshot manifest', () => {
      const snapshot = factory.createSnapshot(500, { world: 'state' }, []);
      
      expect(snapshot.header.kind).toBe('snapshot');
      expect(snapshot.body.payloadMode).toBe('full_snapshot');
    });

    it('maintains chain state', () => {
      const tick1 = factory.createDeltaTick(1, {}, []);
      const tick2 = factory.createDeltaTick(2, {}, []);
      
      expect(tick2.header.previousStateHash).toBe(tick1.header.stateHash);
    });
  });

  describe('ManifestReplayGuard', () => {
    it('accepts new manifests', () => {
      const tick = factory.createDeltaTick(1, {}, []);
      const result = replayGuard.accept(tick);
      
      expect(result.accepted).toBe(true);
    });

    it('rejects duplicate ticks', () => {
      const tick = factory.createDeltaTick(1, {}, []);
      replayGuard.accept(tick);
      
      const result = replayGuard.accept(tick);
      expect(result.accepted).toBe(false);
      expect(result.reason).toContain('already seen');
    });

    it('rejects out-of-order ticks', () => {
      const tick2 = factory.createDeltaTick(2, {}, []);
      replayGuard.accept(tick2);
      
      const tick1 = factory.createDeltaTick(1, {}, []);
      const result = replayGuard.accept(tick1);
      
      expect(result.accepted).toBe(false);
    });
  });

  describe('Hash Functions', () => {
    it('produces 64-char hex hashes', () => {
      const hash = sha256('test');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('combines hashes deterministically', () => {
      const combined = sha256Combine('a', 'b', 'c');
      expect(combined.length).toBe(64);
    });

    it('canonicalizes objects deterministically', () => {
      const obj = { b: 2, a: 1 };
      const str1 = toCanonicalString(obj);
      const str2 = toCanonicalString(obj);
      expect(str1).toBe(str2);
    });

    it('handles key ordering in canonicalization', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(toCanonicalString(obj1)).toBe(toCanonicalString(obj2));
    });
  });

  describe('Verification', () => {
    it('verifies valid manifest', () => {
      const tick = factory.createDeltaTick(1, { data: 'test' }, []);
      const result = verifyManifest(tick, AUTHORITY_SECRET);
      
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('rejects tampered manifest', () => {
      const tick = factory.createDeltaTick(1, { data: 'test' }, []);
      tick.header.stateHash = 'invalid' + '0'.repeat(48);
      
      const result = verifyManifest(tick, AUTHORITY_SECRET);
      expect(result.valid).toBe(false);
    });

    it('isLikelyValid quick check works', () => {
      const tick = factory.createDeltaTick(1, {}, []);
      expect(isLikelyValid(tick)).toBe(true);
      expect(isLikelyValid(null)).toBe(false);
      expect(isLikelyValid({})).toBe(false);
    });
  });

  describe('SelfHeal Integration', () => {
    it('includes self-heal metadata', () => {
      const tick = factory.createSelfHeal(100, {
        healState: 'healed',
        anomalyScore: 0.2,
        patchedSubsystems: ['physics', 'npc_ai'],
      }, []);
      
      expect(tick.header.kind).toBe('self_heal');
      expect(tick.body.selfHeal?.healState).toBe('healed');
    });
  });

  describe('Dependency Tracking', () => {
    it('creates dependency entries', () => {
      const deps: IManifestDependency[] = [
        { componentId: 'entity_group', kind: 'entity_group', checksum: sha256('entities'), schemaVersion: 1, entityCount: 50 },
        { componentId: 'physics', kind: 'physics', checksum: sha256('physics'), schemaVersion: 1 },
      ];
      
      const tick = factory.createDeltaTick(1, {}, deps);
      
      expect(tick.body.dependencies.length).toBe(2);
      expect(tick.header.dependencyRootHash.length).toBe(64);
    });
  });

  describe('Divergence Detection', () => {
    it('creates resync manifest', () => {
      const resync = factory.createResync(100, { world: 'state' }, {
        expectedHash: sha256('expected'),
        actualHash: sha256('actual'),
        divergenceTick: 99,
        divergedComponents: ['entity_group'],
        snapshotId: 'snapshot_0',
      });
      
      expect(resync.header.kind).toBe('resync');
      expect(resync.divergence).toBeDefined();
      expect(resync.divergence?.divergedComponents).toContain('entity_group');
    });
  });
});