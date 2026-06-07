/**
 * WALLET TYPES
 *
 * Server-authoritative player currency/wallet types.
 * Deterministic: No Date.now(), no Math.random(), stable coin IDs and ordering.
 */

export type CurrencyId = "coin";

export interface WalletState {
  playerId: string;
  schemaVersion: 1;
  balances: Record<CurrencyId, number>;
}

export interface WalletSnapshot {
  playerId: string;
  coin: number;
}

export const DEFAULT_WALLET_BALANCES: Record<CurrencyId, number> = {
  coin: 0,
};

export function createDefaultWalletState(playerId: string): WalletState {
  return {
    playerId,
    schemaVersion: 1,
    balances: { ...DEFAULT_WALLET_BALANCES },
  };
}

export function normalizeWalletBalance(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function toWalletSnapshot(state: WalletState): WalletSnapshot {
  return {
    playerId: state.playerId,
    coin: state.balances.coin,
  };
}