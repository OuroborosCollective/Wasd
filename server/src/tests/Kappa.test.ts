import { describe, expect, it } from 'vitest';
import { KAPPA, assertSafeInteger, fromKappaInt, kAdd, kDiv, kMul, kSub, toKappa } from '../core/are/Kappa';

describe('ARE-Logic: Kappa fixed-point math kernel', () => {
  describe('constants and conversions', () => {
    it('keeps KAPPA strictly fixed at 1000', () => {
      expect(KAPPA).toBe(1000);
    });

    it('converts decimal boundary input into kappa integers', () => {
      expect(toKappa(1.25)).toBe(1250);
      expect(toKappa(-2.5)).toBe(-2500);
      expect(toKappa(0)).toBe(0);
    });

    it('converts kappa integers back only for display/debug values', () => {
      expect(fromKappaInt(1250)).toBe(1.25);
      expect(fromKappaInt(-2500)).toBe(-2.5);
    });
  });

  describe('deterministic operations', () => {
    it('adds fixed-point integers without scale changes', () => {
      expect(kAdd(1000, 250)).toBe(1250);
    });

    it('subtracts fixed-point integers without scale changes', () => {
      expect(kSub(1250, 250)).toBe(1000);
    });

    it('multiplies fixed-point integers and rescales by kappa', () => {
      expect(kMul(1250, 2000)).toBe(2500);
    });

    it('divides fixed-point integers and rescales by kappa', () => {
      expect(kDiv(2500, 2000)).toBe(1250);
    });

    it('truncates multiplication toward zero instead of creating value by rounding up', () => {
      expect(kMul(1001, 1001)).toBe(1002);
      expect(kMul(-1001, 1001)).toBe(-1002);
    });

    it('truncates division toward zero instead of flooring negative values', () => {
      expect(kDiv(1000, 3000)).toBe(333);
      expect(kDiv(-1000, 3000)).toBe(-333);
    });
  });

  describe('ARE Guard protections', () => {
    it('rejects float inputs in core math operations', () => {
      expect(() => kAdd(1000.5, 250)).toThrow('[ARE-Guard]');
      expect(() => kMul(1250, 1.5)).toThrow('[ARE-Guard]');
    });

    it('rejects NaN and Infinity boundary inputs', () => {
      expect(() => toKappa(Number.NaN)).toThrow('[ARE-Guard]');
      expect(() => toKappa(Number.POSITIVE_INFINITY)).toThrow('[ARE-Guard]');
    });

    it('rejects division by zero', () => {
      expect(() => kDiv(1000, 0)).toThrow('[ARE-Guard]');
    });

    it('rejects unsafe integer inputs', () => {
      expect(() => assertSafeInteger(Number.MAX_SAFE_INTEGER + 1, 'test')).toThrow('[ARE-Guard]');
    });

    it('rejects unsafe integer overflow results', () => {
      expect(() => kAdd(Number.MAX_SAFE_INTEGER, 1)).toThrow('[ARE-Guard]');
      expect(() => kMul(Number.MAX_SAFE_INTEGER, 2000)).toThrow('[ARE-Guard]');
    });
  });
});
