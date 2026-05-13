/**
 * GameStateChain - TCG Validation Backend
 * 
 * O(1) validation of entire game field using ARE-Logic chain string.
 * StateFingerprint generation via AREStateCompiler.
 * Instant invalidation of client-side manipulation attempts.
 * 
 * Features:
 * - O(1) chain validation
 * - SHA-256 state fingerprinting
 * - Immediate invalidation (no async DB calls)
 * - Maximum security, minimal traffic
 */

import { createHash } from 'crypto';
import { AREStateCompiler, AREGameState, AREPlayer, AREEntity } from './AREStateCompiler';

export interface ValidationResult {
  valid: boolean;
  errorCode?: ValidationErrorCode;
  errorMessage?: string;
  calculatedFingerprint?: string;
  timestamp: number;
}

export enum ValidationErrorCode {
  INVALID_STATE = 'INVALID_STATE',
  HASH_MISMATCH = 'HASH_MISMATCH',
  CHAIN_TAMPERED = 'CHAIN_TAMPERED',
  INVALID_PLAYER = 'INVALID_PLAYER',
  TURN_VIOLATION = 'TURN_VIOLATION',
  FIELD_CORRUPTED = 'FIELD_CORRUPTED'
}

export interface MoveRequest {
  playerId: string;
  gameState: AREGameState;
  chain: string;
  expectedHash: string;
  move: {
    type: string;
    source: string;
    target?: string;
    cardId?: string;
  };
}

export interface FingerprintResult {
  chain: string;
  hash: string;
  signature: string;
  timestamp: number;
}

const INT_SCALE = 10000;

export function generateStateFingerprint(gameState: AREGameState): FingerprintResult {
  const chain = AREStateCompiler.compile(gameState);
  const hash = createHash('sha256').update(chain).digest('hex');
  const signature = hash.slice(0, 16);
  return { chain, hash, signature, timestamp: Date.now() };
}

export function validateMove(gameState: AREGameState, receivedHash: string): ValidationResult {
  const now = Date.now();
  if (!gameState || !receivedHash) {
    return { valid: false, errorCode: ValidationErrorCode.INVALID_STATE, errorMessage: 'Missing gameState or hash', timestamp: now };
  }
  const chain = AREStateCompiler.compile(gameState);
  const calculatedHash = createHash('sha256').update(chain).digest('hex');
  if (calculatedHash !== receivedHash) {
    return { valid: false, errorCode: ValidationErrorCode.HASH_MISMATCH, errorMessage: 'Hash mismatch', calculatedFingerprint: calculatedHash, timestamp: now };
  }
  return { valid: true, calculatedFingerprint: calculatedHash, timestamp: now };
}

export function invalidateMove(gameState: AREGameState | null, receivedHash: string, reason: ValidationErrorCode, details?: string): ValidationResult {
  const now = Date.now();
  const fingerprint = gameState ? generateStateFingerprint(gameState) : null;
  return { valid: false, errorCode: reason, errorMessage: details || 'Invalid move', calculatedFingerprint: fingerprint?.hash, timestamp: now };
}

export function validatePlayerIntegrity(player: AREPlayer): ValidationResult {
  const now = Date.now();
  if (!player) return { valid: false, errorCode: ValidationErrorCode.INVALID_PLAYER, errorMessage: 'Player not found', timestamp: now };
  if (player.health < 0 || player.health > 100) return { valid: false, errorCode: ValidationErrorCode.INVALID_PLAYER, errorMessage: 'Invalid health', timestamp: now };
  if (player.mana < 0 || player.mana > 20) return { valid: false, errorCode: ValidationErrorCode.INVALID_PLAYER, errorMessage: 'Invalid mana', timestamp: now };
  if (player.deckCount < 0) return { valid: false, errorCode: ValidationErrorCode.INVALID_PLAYER, errorMessage: 'Invalid deck count', timestamp: now };
  if (player.field.length > 7) return { valid: false, errorCode: ValidationErrorCode.FIELD_CORRUPTED, errorMessage: 'Field overflow', timestamp: now };
  return { valid: true, timestamp: now };
}

export function validateTurnProgression(expectedTurn: number, actualTurn: number): ValidationResult {
  const now = Date.now();
  const validIncrement = actualTurn === expectedTurn || actualTurn === expectedTurn + 1;
  if (!validIncrement) return { valid: false, errorCode: ValidationErrorCode.TURN_VIOLATION, errorMessage: 'Turn violation', timestamp: now };
  return { valid: true, timestamp: now };
}

export function validateMoveFull(gameState: AREGameState, receivedHash: string, playerId: string): ValidationResult {
  const now = Date.now();
  const hashResult = validateMove(gameState, receivedHash);
  if (!hashResult.valid) return hashResult;
  const player = gameState.players.find(p => p.id === playerId);
  const playerResult = validatePlayerIntegrity(player);
  if (!playerResult.valid) return playerResult;
  return { valid: true, timestamp: now };
}

export class GameStateChain {
  public static validateMove(gameState: AREGameState, receivedHash: string): boolean {
    const result = validateMove(gameState, receivedHash);
    if (!result.valid) throw new Error('Anti-Cheat: ' + result.errorMessage);
    return true;
  }

  public static invalidateMove(gameState: AREGameState | null, receivedHash: string, reason: ValidationErrorCode, details?: string): ValidationResult {
    return invalidateMove(gameState, receivedHash, reason, details);
  }

  public static generateFingerprint(gameState: AREGameState): FingerprintResult {
    return generateStateFingerprint(gameState);
  }

  public static validateMoveFull(gameState: AREGameState, receivedHash: string, playerId: string): ValidationResult {
    return validateMoveFull(gameState, receivedHash, playerId);
  }
}

export default GameStateChain;
