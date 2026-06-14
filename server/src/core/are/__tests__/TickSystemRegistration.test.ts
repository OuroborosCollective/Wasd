import { describe, expect, it } from 'vitest';
import { registerCoreTickSystems } from '../CoreTickSystemRegistration.js';
import { OUROBOROS_TICK_SYSTEM_NAME } from '../OuroborosTickSystem.js';
import { ORACLE_TICK_SYSTEM_NAME } from '../OracleTickSystem.js';
import { createDefaultTickContext, TickSystemPriority, type TickSystem } from '../TickSystem.js';
import { TickSystemRegistry } from '../TickSystemRegistry.js';

function createRecordingSystem(
  name: string,
  priority: TickSystemPriority,
  calls: string[],
): TickSystem {
  return {
    id: name,
    name,
    priority,
    enabled: true,
    tick(): void {
      calls.push(name);
    },
  };
}

describe('TickSystem registration truth', () => {
  it('executes equal-priority systems by stable id/name order', () => {
    const calls: string[] = [];
    const registry = new TickSystemRegistry();

    registry.register({
      system: createRecordingSystem('system-beta', TickSystemPriority.NORMAL, calls),
      dependencies: ['zeta', 'alpha'],
      tags: ['runtime', 'tick'],
    });

    registry.register({
      system: createRecordingSystem('system-alpha', TickSystemPriority.NORMAL, calls),
      dependencies: ['input'],
      tags: ['tick'],
    });

    registry.executeAll(createDefaultTickContext(1));

    expect(calls).toEqual(['system-alpha', 'system-beta']);
    expect(registry.getRegistrationSnapshot().map((entry) => entry.name)).toEqual([
      'system-alpha',
      'system-beta',
    ]);
    expect(registry.getRegistrationSnapshot()[1].dependencies).toEqual(['alpha', 'zeta']);
  });

  it('registers core tick systems once per registry', () => {
    const registry = new TickSystemRegistry();

    const first = registerCoreTickSystems({}, registry);
    const second = registerCoreTickSystems({}, registry);

    expect(first.registered).toEqual([ORACLE_TICK_SYSTEM_NAME, OUROBOROS_TICK_SYSTEM_NAME]);
    expect(first.alreadyRegistered).toEqual([]);
    expect(second.registered).toEqual([]);
    expect(second.alreadyRegistered).toEqual([ORACLE_TICK_SYSTEM_NAME, OUROBOROS_TICK_SYSTEM_NAME]);

    expect(registry.getRegistrationSnapshot().map((entry) => entry.name)).toEqual([
      ORACLE_TICK_SYSTEM_NAME,
      OUROBOROS_TICK_SYSTEM_NAME,
    ]);
  });
});
