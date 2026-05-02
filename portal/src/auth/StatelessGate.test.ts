import { describe, it, expect, beforeEach } from 'vitest';
import { StatelessGate } from './StatelessGate';

describe('StatelessGate', () => {
    let gate: StatelessGate;
    const secret = 'test-secret-key';
    const index = 42;

    beforeEach(() => {
        gate = new StatelessGate();
    });

    describe('generateToken', () => {
        it('should generate a deterministic token', async () => {
            const token1 = await gate.generateToken(secret, index);
            const token2 = await gate.generateToken(secret, index);

            expect(token1).toBe(token2);
            expect(token1).toHaveLength(64); // 256 bits = 32 bytes = 64 hex chars
        });

        it('should generate different tokens for different indices', async () => {
            const token1 = await gate.generateToken(secret, index);
            const token2 = await gate.generateToken(secret, index + 1);

            expect(token1).not.toBe(token2);
        });

        it('should generate different tokens for different secrets', async () => {
            const token1 = await gate.generateToken(secret, index);
            const token2 = await gate.generateToken('other-secret', index);

            expect(token1).not.toBe(token2);
        });
    });

    describe('verifyToken', () => {
        it('should return true for a valid token', async () => {
            const token = await gate.generateToken(secret, index);
            const isValid = await gate.verifyToken(token, secret, index);

            expect(isValid).toBe(true);
        });

        it('should return false for an incorrect token', async () => {
            // Using a hex-like string of correct length to test the compare loop if length matches
            const dummyToken = 'a'.repeat(64);
            const isValid = await gate.verifyToken(dummyToken, secret, index);
            expect(isValid).toBe(false);
        });

        it('should return false for a correct token but wrong index', async () => {
            const token = await gate.generateToken(secret, index);
            const isValid = await gate.verifyToken(token, secret, index + 1);

            expect(isValid).toBe(false);
        });

        it('should return false for a correct token but wrong secret', async () => {
            const token = await gate.generateToken(secret, index);
            const isValid = await gate.verifyToken(token, 'wrong-secret', index);

            expect(isValid).toBe(false);
        });

        it('should return false for tokens of different lengths (secureCompare check)', async () => {
            const token = await gate.generateToken(secret, index);
            const shortToken = token.substring(0, 10);
            const isValid = await gate.verifyToken(shortToken, secret, index);

            expect(isValid).toBe(false);
        });
    });
});
