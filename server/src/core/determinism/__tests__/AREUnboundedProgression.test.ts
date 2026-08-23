import { describe, expect, it } from 'vitest';
import {
  advanceUnboundedProgression,
  createInitialProgressionState,
  normalizeProgressionState,
  progressionFromLegacyTotalXp,
  projectExactToSafeNumber,
  xpRequiredForNextLevelExact,
} from '../AREUnboundedProgression.js';

describe('AREUnboundedProgression', () => {
  it('preserves known curve values', () => {
    expect(xpRequiredForNextLevelExact(1)).toBe(50n);
    expect(xpRequiredForNextLevelExact(2)).toBe(131n);
    expect(xpRequiredForNextLevelExact(3)).toBe(232n);
    expect(xpRequiredForNextLevelExact(10)).toBe(1255n);
  });

  it('advances beyond level 99', () => {
    const state = normalizeProgressionState({ totalXp: '1000000000', level: 99, xpIntoLevel: 0 });
    const advanced = advanceUnboundedProgression(state, xpRequiredForNextLevelExact(99));
    expect(advanced.state.level).toBe(100n);
    expect(advanced.levelsGained).toBe(1n);
  });

  it('advances beyond the former safety ceiling', () => {
    const state = normalizeProgressionState({ totalXp: '999999999999999999', level: 999999, xpIntoLevel: 0 });
    const advanced = advanceUnboundedProgression(state, xpRequiredForNextLevelExact(999999));
    expect(advanced.state.level).toBe(1000000n);
  });

  it('supports exact levels beyond Number safe integer range', () => {
    const level = '1000000000000000000000000';
    const required = xpRequiredForNextLevelExact(level);
    const state = normalizeProgressionState({ totalXp: required.toString(), level, xpIntoLevel: 0 });
    const advanced = advanceUnboundedProgression(state, required);
    expect(advanced.state.level).toBe(BigInt(level) + 1n);
  });

  it('marks unsafe Number projections as non-exact', () => {
    const projected = projectExactToSafeNumber('9007199254740992');
    expect(projected.value).toBe(Number.MAX_SAFE_INTEGER);
    expect(projected.exact).toBe(false);
  });

  it('migrates legacy total XP deterministically', () => {
    const migrated = progressionFromLegacyTotalXp(201);
    expect(migrated.level).toBe(3n);
    expect(migrated.xpIntoLevel).toBe(20n);
  });

  it('is chunking invariant for XP application', () => {
    const initial = createInitialProgressionState();
    const oneBatch = advanceUnboundedProgression(initial, 1000).state;
    const chunked = advanceUnboundedProgression(advanceUnboundedProgression(initial, 400).state, 600).state;
    expect(chunked).toEqual(oneBatch);
  });
});
