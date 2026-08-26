import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TickSystemContext } from '../TickSystem.js';
import { getOuroborosTickSystem } from '../OuroborosTickSystem.js';
import { worldTickAdapter } from '../WorldTickThinShellAdapter.js';

describe('Ouroboros adapter chat wiring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('binds the real adapter status emitter before an active NPC Ouroboros tick', () => {
    const emitStatus = vi.spyOn(worldTickAdapter.chatRouter, 'emitStatus');

    const tickContext = {
      tickId: 10,
      world: {
        npcs: [
          {
            id: 'npc_status_wiring_regression',
            name: 'Status Guide',
            position: { x: 12, y: -4 },
            health: 100,
            maxHealth: 100,
            energy: 100,
            maxEnergy: 100,
            gold: 0,
          },
        ],
        players: [],
      },
    } as unknown as TickSystemContext;

    expect(() => getOuroborosTickSystem().tick(tickContext)).not.toThrow();
    expect(emitStatus).toHaveBeenCalledWith(
      '[Status Guide] [idle]',
      { x: 12, y: -4 },
      worldTickAdapter.players,
      worldTickAdapter.sendToPlayer,
      worldTickAdapter.resolveSocketId,
    );
  });
});
