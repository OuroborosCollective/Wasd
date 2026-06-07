/**
 * WALLET PERSISTENCE INTERFACE
 *
 * Defines the contract for wallet persistence adapters.
 * Supports JSON file-based and Postgres backends.
 */

import { type WalletState } from "./WalletTypes.js";

export interface PersistedWalletState extends WalletState {
  schemaVersion: 1;
}

export interface WalletPersistenceAdapter {
  loadWallet(playerId: string): Promise<PersistedWalletState | null>;
  saveWallet(state: PersistedWalletState): Promise<void>;
  health?(): Promise<{ ok: boolean; driver: string; error?: string }>;
}

export function createPersistedWalletState(
  playerId: string,
  state: WalletState,
): PersistedWalletState {
  return {
    playerId,
    schemaVersion: 1,
    balances: { ...state.balances },
  };
}