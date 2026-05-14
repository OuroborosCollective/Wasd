/**
 * GuildSovereigntyEngine - Smart Contract Transaction Simulator
 * 
 * Simulates AAAAA+ ecosystem smart contract transactions deterministically
 * BEFORE they are written to real blockchain (Solana/Ethereum).
 * 
 * The engine is STATELESS - uses only current 10-Hz tick state.
 * Client and Server MUST produce identical results.
 * 
 * No Mocks - Full TypeScript type safety required.
 */

import type { ChainString } from './AREEngineBox.js';

/**
 * Transaction Result
 */
export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  errorCode?: TransactionErrorCode;
  errorMessage?: string;
  timestamp: number;
  deterministicSeed: number;
}

/**
 * Transaction Error Codes
 */
export enum TransactionErrorCode {
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  COOLDOWN_LOCKOUT = 'COOLDOWN_LOCKOUT',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',
  TIMEOUT = 'TIMEOUT',
  STATE_MISMATCH = 'STATE_MISMATCH',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Transaction Types
 */
export enum TransactionType {
  MINT = 'MINT',
  TRANSFER = 'TRANSFER',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  VOTE = 'VOTE',
  UPGRADE = 'UPGRADE',
  CREATE_GUILD = 'CREATE_GUILD',
  JOIN_GUILD = 'JOIN_GUILD',
  LEAVE_GUILD = 'LEAVE_GUILD'
}

/**
 * ARE Payload for Guild Operations
 */
export interface AREPayload {
  id: string;
  type: TransactionType;
  sender: string;
  receiver?: string;
  amount: number;
  chain: ChainString;
  timestamp: number;
  nonce: number;
  signature?: string;
}

/**
 * Guild State Data (parsed from chain)
 */
export interface GuildState {
  guildId: string;
  owner: string;
  members: Record<string, GuildMember>;
  treasury: number;
  tier: number;
  createdAt: number;
  cooldownUntil: number;
  lastTransactionAt: number;
}

interface GuildMember {
  address: string;
  joinedAt: number;
  staked: number;
  votingPower: number;
}

/**
 * Wallet State (parsed from chain)
 */
export interface WalletState {
  address: string;
  balance: number;
  staked: number;
  nonce: number;
  lastActionAt: number;
  cooldownUntil: number;
}

/**
 * Guild Configuration
 */
export interface GuildConfig {
  minStake: number;
  cooldownMs: number;
  maxMembers: number;
  treasuryPercentage: number;
  upgradeCost: Record<number, number>;
}

/**
 * Default Guild Configuration
 */
export const DEFAULT_GUILD_CONFIG: GuildConfig = {
  minStake: 100,
  cooldownMs: 60000,
  maxMembers: 100,
  treasuryPercentage: 5,
  upgradeCost: {
    1: 1000,
    2: 5000,
    3: 25000,
    4: 100000
  }
};

/**
 * COOLDOWN Lockout duration in ms
 */
export const COOLDOWN_LOCKOUT_MS = 60000; // 60 seconds

/**
 * MINIMUM_BALANCE required for transactions (AAAAAA+ ecosystem)
 */
export const MINIMUM_BALANCE = 1;

/**
 * GAS estimates per transaction type (fixed, deterministic)
 */
export const GAS_ESTIMATES: Record<TransactionType, number> = {
  [TransactionType.MINT]: 5000,
  [TransactionType.TRANSFER]: 3000,
  [TransactionType.STAKE]: 4000,
  [TransactionType.UNSTAKE]: 4000,
  [TransactionType.VOTE]: 2000,
  [TransactionType.UPGRADE]: 10000,
  [TransactionType.CREATE_GUILD]: 15000,
  [TransactionType.JOIN_GUILD]: 5000,
  [TransactionType.LEAVE_GUILD]: 4000
};

/**
 * Parse chain string to extract wallet state
 * Format: O{open}|H{high}|L{low}|C{close}|N{tickCount}|B{balance}|S{staked}|A{lastAction}
 */
export function parseWalletState(chain: ChainString): WalletState {
  if (!chain || typeof chain !== 'string') {
    return {
      address: '',
      balance: 0,
      staked: 0,
      nonce: 0,
      lastActionAt: 0,
      cooldownUntil: 0
    };
  }

  const parts = chain.split('|');
  const state: Partial<WalletState> = {
    lastActionAt: 0,
    cooldownUntil: 0
  };

  for (const part of parts) {
    const key = part.charAt(0);
    const value = parseInt(part.slice(1), 10);

    switch (key) {
      case 'O':
        // Open value as balance (default)
        state.balance = isNaN(value) ? 0 : value;
        break;
      case 'B':
        state.balance = isNaN(value) ? 0 : value;
        break;
      case 'S':
        state.staked = isNaN(value) ? 0 : value;
        break;
      case 'N':
        state.nonce = isNaN(value) ? 0 : value;
        break;
      case 'A':
        state.lastActionAt = isNaN(value) ? 0 : value;
        break;
      case 'T':
        // Tick count
        state.nonce = isNaN(value) ? 0 : value;
        break;
    }
  }

  // Calculate cooldown until
  const lastActionAt = state.lastActionAt ?? 0;
  if (lastActionAt > 0) {
    state.cooldownUntil = lastActionAt + COOLDOWN_LOCKOUT_MS;
  }

  return {
    address: '',
    balance: state.balance ?? 0,
    staked: state.staked ?? 0,
    nonce: state.nonce ?? 0,
    lastActionAt: state.lastActionAt ?? 0,
    cooldownUntil: state.cooldownUntil ?? 0
  };
}

/**
 * Parse guild state from chain
 * Format: G{guildId}|M{memberCount}|T{treasury}|I{tier}|C{cooldown}|L{lastTx}
 */
export function parseGuildState(chain: ChainString): GuildState {
  if (!chain || typeof chain !== 'string') {
    return {
      guildId: '',
      owner: '',
      members: {},
      treasury: 0,
      tier: 0,
      createdAt: 0,
      cooldownUntil: 0,
      lastTransactionAt: 0
    };
  }

  const parts = chain.split('|');
  const state: Partial<GuildState> = {
    members: {},
    createdAt: 0,
    cooldownUntil: 0,
    lastTransactionAt: 0
  };

  for (const part of parts) {
    const key = part.charAt(0);
    const value = part.slice(1);

    switch (key) {
      case 'G':
        state.guildId = value;
        break;
      case 'O':
        state.owner = value;
        break;
      case 'T':
        state.treasury = parseInt(value, 10) || 0;
        break;
      case 'I':
        state.tier = parseInt(value, 10) || 0;
        break;
      case 'C':
        state.cooldownUntil = parseInt(value, 10) || 0;
        break;
      case 'L':
        state.lastTransactionAt = parseInt(value, 10) || 0;
        break;
    }
  }

  return {
    guildId: state.guildId ?? '',
    owner: state.owner ?? '',
    members: state.members ?? {},
    treasury: state.treasury ?? 0,
    tier: state.tier ?? 0,
    createdAt: state.createdAt ?? 0,
    cooldownUntil: state.cooldownUntil ?? 0,
    lastTransactionAt: state.lastTransactionAt ?? 0
  };
}

/**
 * Generate deterministic transaction hash
 * Uses kappaPos scaling for reproducible results
 */
function generateTransactionHash(
  payload: AREPayload,
  seed: number
): string {
  const str = `${payload.id}|${payload.type}|${payload.sender}|${payload.amount}|${payload.nonce}|${seed}`;
  
  // Simple hash for deterministic simulation (not real crypto)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  // Convert to hex-like string
  const hashStr = Math.abs(hash).toString(16).padStart(16, '0');
  return `0x${hashStr.substring(0, 8)}${hashStr.substring(8, 16)}`;
}

/**
 * Validate signature (simplified for deterministic simulation)
 */
function validateSignature(payload: AREPayload): boolean {
  if (!payload.signature || !payload.sender) {
    return false;
  }
  
  // Basic validation - signature must exist and not be empty
  return payload.signature.length >= 10;
}

/**
 * Check cooldown lockout
 */
function checkCooldownLockout(
  walletState: WalletState,
  currentTime: number
): boolean {
  return walletState.cooldownUntil > currentTime;
}

/**
 * Check insufficient funds
 */
function checkInsufficientFunds(
  walletState: WalletState,
  required: number,
  transactionType: TransactionType
): boolean {
  // For STAKE/UNSTAKE, check staked balance
  if (transactionType === TransactionType.STAKE) {
    return walletState.balance < required;
  }
  
  if (transactionType === TransactionType.UNSTAKE) {
    return walletState.staked < required;
  }
  
  // For other transactions, check main balance
  return walletState.balance < required + MINIMUM_BALANCE;
}

/**
 * Calculate required amount with gas
 */
function calculateRequiredAmount(
  amount: number,
  transactionType: TransactionType
): number {
  const gas = GAS_ESTIMATES[transactionType] || 0;
  return amount + Math.floor(gas / 1000);
}

/**
 * Simulate Transaction
 * 
 * This is the MAIN export function.
 * It MUST be deterministic and work identically on Client and Server.
 * 
 * @param payload - ARE Payload with transaction details
 * @returns TransactionResult with success/error state
 */
export function simulateTransaction(payload: AREPayload): TransactionResult {
  const currentTime = payload.timestamp;
  const seed = payload.nonce * 1000 + Math.floor(currentTime / 100);
  
  // Parse current 10-Hz tick state
  const walletState = parseWalletState(payload.chain);
  
  // Step 1: Validate signature
  if (!validateSignature(payload)) {
    return {
      success: false,
      errorCode: TransactionErrorCode.INVALID_SIGNATURE,
      errorMessage: 'Invalid or missing signature',
      timestamp: currentTime,
      deterministicSeed: seed
    };
  }
  
  // Step 2: Check cooldown lockout
  if (checkCooldownLockout(walletState, currentTime)) {
    const remainingMs = walletState.cooldownUntil - currentTime;
    return {
      success: false,
      errorCode: TransactionErrorCode.COOLDOWN_LOCKOUT,
      errorMessage: `Cooldown active. ${Math.ceil(remainingMs / 1000)}s remaining.`,
      timestamp: currentTime,
      deterministicSeed: seed
    };
  }
  
  // Step 3: Calculate required amount
  const requiredAmount = calculateRequiredAmount(
    payload.amount,
    payload.type
  );
  
  // Step 4: Check insufficient funds
  if (checkInsufficientFunds(walletState, requiredAmount, payload.type)) {
    return {
      success: false,
      errorCode: TransactionErrorCode.INSUFFICIENT_FUNDS,
      errorMessage: `Insufficient funds. Required: ${requiredAmount}, Available: ${walletState.balance}`,
      timestamp: currentTime,
      deterministicSeed: seed
    };
  }
  
  // Step 5: Validate state consistency (stateless check)
  if (payload.nonce !== walletState.nonce + 1) {
    return {
      success: false,
      errorCode: TransactionErrorCode.STATE_MISMATCH,
      errorMessage: `Nonce mismatch. Expected: ${walletState.nonce + 1}, Got: ${payload.nonce}`,
      timestamp: currentTime,
      deterministicSeed: seed
    };
  }
  
  // Step 6: Success - generate deterministic transaction hash
  const transactionHash = generateTransactionHash(payload, seed);
  const gasUsed = GAS_ESTIMATES[payload.type] || 0;
  
  return {
    success: true,
    transactionHash,
    blockNumber: Math.floor(currentTime / 1000) + 1,
    gasUsed,
    timestamp: currentTime,
    deterministicSeed: seed
  };
}
