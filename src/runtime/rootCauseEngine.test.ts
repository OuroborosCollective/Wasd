import { describe, it, expect } from 'vitest';
import { createDependencyGraph, findRootCause } from './rootCauseEngine';

describe('rootCauseEngine (wasd)', () => {
  it('locates root cause', () => {
    const g = createDependencyGraph([
      { from: 'Server', to: 'NPCSystem' },
      { from: 'NPCSystem', to: 'QuestSystem' },
    ]);
    const r = findRootCause(g, 'QuestSystem');
    expect(r.cause).toBe('Server');
    expect(r.path).toEqual(['Server', 'NPCSystem', 'QuestSystem']);
  });
});
