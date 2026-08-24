import { describe, it, expect, vi } from 'vitest';
import { TickSystemPriority } from '../TickSystem.js';
import { CombatTickSystem } from '../CombatTickSystem.js';

describe('CombatTickSystem', () => {
  const createMockCombatSystem = () => ({
    attack: vi.fn((attacker: any, defender: any) => {
      attacker.stamina = Number(attacker.stamina ?? 100) - 8;
      defender.health = Math.max(0, Number(defender.health ?? 0) - 10);
      return {
        success: true,
        hit: true,
        damage: 10,
        defenderHealth: defender.health,
        killed: defender.health <= 0,
      };
    }),
    attackWithWeapon: vi.fn(),
    spellStrike: vi.fn(),
  });

  const createMockCombatService = () => ({
    handleSkillRequest: vi.fn(),
  });

  function createRuntime() {
    const combat = createMockCombatSystem();
    const service = createMockCombatService();
    const system = new CombatTickSystem(combat as any, service as any);
    const player = {
      id: 'player-1',
      stamina: 100,
      position: { x: 0, y: 0 },
    };
    const npc = {
      id: 'npc-1',
      health: 90,
      maxHealth: 90,
      position: { x: 3, y: 4 },
    };
    system.setPlayerProvider((id) => id === player.id ? player : null);
    system.setNpcProvider((id) => id === npc.id ? npc : null);
    return { system, combat, service, player, npc };
  }

  describe('TickSystem interface compliance', () => {
    it('has the canonical combat identity and gameplay priority', () => {
      const { system } = createRuntime();
      expect(system.name).toBe('combat');
      expect(system.priority).toBe(TickSystemPriority.GAMEPLAY);
      expect(system.enabled).toBe(true);
    });

    it('exposes the underlying combat implementations', () => {
      const { system, combat, service } = createRuntime();
      expect(system.getCombatSystem()).toBe(combat);
      expect(system.getCombatService()).toBe(service);
    });
  });

  describe('canonical attack queue', () => {
    it('never mutates combat state before the authoritative tick', () => {
      const { system, combat, player, npc } = createRuntime();
      const hash = 'a'.repeat(64);
      expect(system.enqueueAttack({
        intentHash: hash,
        attackerId: player.id,
        targetId: npc.id,
        acceptedAtTick: 1,
        maxRange: 5,
      })).toBe(true);

      expect(player.stamina).toBe(100);
      expect(npc.health).toBe(90);
      expect(combat.attack).not.toHaveBeenCalled();
      expect(system.getAttackReceipt(hash)).toBeNull();

      system.tick({ tickCount: 1 as any, isHighFrequencyTick: true });

      expect(combat.attack).toHaveBeenCalledTimes(1);
      expect(player.stamina).toBe(92);
      expect(npc.health).toBe(80);
      expect(system.getAttackReceipt(hash)).toMatchObject({
        intentHash: hash,
        executionTick: 1,
        applied: true,
        distance: 5,
        before: { attackerStamina: 100, targetHealth: 90 },
        after: { attackerStamina: 92, targetHealth: 80 },
      });
    });

    it('revalidates range inside the tick and rejects out-of-range attacks without mutation', () => {
      const { system, combat, player, npc } = createRuntime();
      npc.position = { x: 6, y: 0 };
      const hash = 'b'.repeat(64);
      expect(system.enqueueAttack({
        intentHash: hash,
        attackerId: player.id,
        targetId: npc.id,
        acceptedAtTick: 4,
        maxRange: 5,
      })).toBe(true);

      system.tick({ tickCount: 4 as any, isHighFrequencyTick: true });

      expect(combat.attack).not.toHaveBeenCalled();
      expect(player.stamina).toBe(100);
      expect(npc.health).toBe(90);
      expect(system.getAttackReceipt(hash)).toMatchObject({
        applied: false,
        reason: 'target_out_of_range',
        distance: 6,
      });
    });

    it('uses intentHash as an idempotency key', () => {
      const { system, player, npc } = createRuntime();
      const intent = {
        intentHash: 'c'.repeat(64),
        attackerId: player.id,
        targetId: npc.id,
        acceptedAtTick: 1,
        maxRange: 5,
      } as const;

      expect(system.enqueueAttack(intent)).toBe(true);
      expect(system.enqueueAttack(intent)).toBe(false);
      system.tick({ tickCount: 1 as any, isHighFrequencyTick: true });
      expect(system.enqueueAttack(intent)).toBe(false);
    });

    it('processes same-tick attack inputs in deterministic intent-hash order', () => {
      const { system, player, npc } = createRuntime();
      const later = 'f'.repeat(64);
      const earlier = 'd'.repeat(64);

      expect(system.enqueueAttack({
        intentHash: later,
        attackerId: player.id,
        targetId: npc.id,
        acceptedAtTick: 2,
        maxRange: 5,
      })).toBe(true);
      expect(system.enqueueAttack({
        intentHash: earlier,
        attackerId: player.id,
        targetId: npc.id,
        acceptedAtTick: 2,
        maxRange: 5,
      })).toBe(true);

      system.tick({ tickCount: 2 as any, isHighFrequencyTick: true });
      expect(system.getLastTickSnapshot().lastProcessedAttackIntentHashes).toEqual([earlier, later]);
    });
  });
});
