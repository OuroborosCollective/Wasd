import { describe, expect, it } from 'vitest';
import { HeuristicGoalPruner } from '../modules/npc/HeuristicGoalPruner';

describe('HeuristicGoalPruner', () => {
  it('keeps all goals below the echo threshold and returns a new array', () => {
    const pruner = new HeuristicGoalPruner();
    const goals = [
      { id: 'walk', isCritical: false },
      { id: 'defend', isCritical: true },
    ];

    const pruned = pruner.prune(goals, 0.5);

    expect(pruned).toHaveLength(2);
    expect(pruned).toEqual(goals);
    expect(pruned).not.toBe(goals);
  });

  it('reduces goals to critical goals at or above the echo threshold', () => {
    const pruner = new HeuristicGoalPruner();
    const goals = [
      { id: 'walk', isCritical: false },
      { id: 'defend', isCritical: true },
      { id: 'celebrate', isCritical: false },
    ];

    const pruned = pruner.prune(goals, 0.8);

    expect(pruned).toEqual([{ id: 'defend', isCritical: true }]);
  });

  it('treats invalid goal input and invalid echo intensity deterministically', () => {
    const pruner = new HeuristicGoalPruner();

    expect(pruner.prune(null, Number.NaN)).toEqual([]);
    expect(pruner.prune(undefined, Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('uses squared distance checks without mutating positions', () => {
    const pruner = new HeuristicGoalPruner({ scanRadius: 40 });
    const origin = { x: 0, y: 0 };
    const near = { x: 24, y: 31 };
    const far = { x: 40, y: 0 };

    expect(pruner.isTargetInRange(origin, near)).toBe(true);
    expect(pruner.isTargetInRange(origin, far)).toBe(false);
    expect(origin).toEqual({ x: 0, y: 0 });
  });

  it('supports custom thresholds deterministically', () => {
    const pruner = new HeuristicGoalPruner({ echoThreshold: 0.25 });
    const goals = [
      { id: 'idle', isCritical: false },
      { id: 'guard', isCritical: true },
    ];

    expect(pruner.prune(goals, 0.24)).toHaveLength(2);
    expect(pruner.prune(goals, 0.25)).toEqual([{ id: 'guard', isCritical: true }]);
  });
});
