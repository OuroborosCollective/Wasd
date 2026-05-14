import { describe, it, expect } from 'vitest';
import { KappaPosGrid, KAPPA_SCALE } from './KappaPos';

describe('KappaPosGrid', () => {
    it('should correctly scale to internal representation', () => {
        expect(KappaPosGrid.toInternal(1)).toBe(1000);
        expect(KappaPosGrid.toInternal(1.234)).toBe(1234);
        expect(KappaPosGrid.toInternal(1.2349)).toBe(1234); // Floor
    });

    it('should correctly scale back to external representation', () => {
        expect(KappaPosGrid.toExternal(1000)).toBe(1);
        expect(KappaPosGrid.toExternal(1234)).toBe(1.234);
    });

    it('should create KappaPos objects deterministically', () => {
        const pos = KappaPosGrid.create(10.5, 20.7, 5.2);
        expect(pos.x).toBe(10500);
        expect(pos.y).toBe(20700);
        expect(pos.z).toBe(5200);
    });

    it('should generate deterministic hashes', () => {
        const pos1 = KappaPosGrid.create(10.5, 20.7);
        const pos2 = KappaPosGrid.create(10.5, 20.7);
        const pos3 = KappaPosGrid.create(10.501, 20.7);

        expect(KappaPosGrid.getHash(pos1)).toBe(KappaPosGrid.getHash(pos2));
        expect(KappaPosGrid.getHash(pos1)).not.toBe(KappaPosGrid.getHash(pos3));
    });

    it('should calculate distance squared deterministically', () => {
        const a = KappaPosGrid.create(0, 0);
        const b = KappaPosGrid.create(3, 4); // 3-4-5 triangle
        // 3 -> 3000, 4 -> 4000
        // 3000^2 + 4000^2 = 9,000,000 + 16,000,000 = 25,000,000
        expect(KappaPosGrid.distanceSq(a, b)).toBe(25000000);
    });

    it('should handle movement deterministically', () => {
        const pos = KappaPosGrid.create(0, 0);
        const moved = KappaPosGrid.move(pos, 1, 2, 0, 0.5);
        // dt = 0.5 -> 500 internal
        // vx = 1 -> 1000 internal
        // vy = 2 -> 2000 internal
        // dx = (1000 * 500) / 1000 = 500
        // dy = (2000 * 500) / 1000 = 1000
        expect(moved.x).toBe(500);
        expect(moved.y).toBe(1000);
    });
});
