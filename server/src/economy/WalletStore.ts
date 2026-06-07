/**
 * WALLET STORE
 *
 * Server-authoritative in-memory wallet store.
 * Deterministic: No Math.random(), stable ordering, no Date.now().
 */

import {
  createDefaultWalletState,
  normalizeWalletBalance,
  type WalletState,
  type CurrencyId,
} from "./WalletTypes.js";

export class WalletStore {
  private readonly wallets = new Map<string, WalletState>();

  getWallet(playerId: string): WalletState {
    const existing = this.wallets.get(playerId);
    if (existing) return existing;

    const created = createDefaultWalletState(playerId);
    this.wallets.set(playerId, created);
    return created;
  }

  addCoins(playerId: string, amount: number): WalletState {
    const state = this.getWallet(playerId);
    const normalized = normalizeWalletBalance(amount);
    if (normalized <= 0) return state;

    const nextState: WalletState = {
      ...state,
      balances: {
        ...state.balances,
        coin: state.balances.coin + normalized,
      },
    };

    this.wallets.set(playerId, nextState);
    return nextState;
  }

  subtractCoins(playerId: string, amount: number): WalletState {
    const state = this.getWallet(playerId);
    const normalized = normalizeWalletBalance(amount);
    if (normalized <= 0) return state;

    const current = state.balances.coin;
    const next = Math.max(0, current - normalized);

    const nextState: WalletState = {
      ...state,
      balances: {
        ...state.balances,
        coin: next,
      },
    };

    this.wallets.set(playerId, nextState);
    return nextState;
  }

  hasCoins(playerId: string, amount: number): boolean {
    const state = this.getWallet(playerId);
    return state.balances.coin >= normalizeWalletBalance(amount);
  }

  replaceWallet(playerId: string, state: WalletState): void {
    this.wallets.set(playerId, state);
  }

  clearForTests(): void {
    this.wallets.clear();
  }
}