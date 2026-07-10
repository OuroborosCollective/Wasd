/**
 * WALLET SERVICE
 *
 * Server-authoritative wallet service with persistence hydration.
 * Deterministic: seeded/tick-safe runtime and stable ordering.
 */

import { WalletStore } from "./WalletStore.js";
import {
  createPersistedWalletState,
  type WalletPersistenceAdapter,
} from "./WalletPersistence.js";
import type { WalletState } from "./WalletTypes.js";

export class WalletService {
  private readonly hydratedPlayers = new Set<string>();

  constructor(
    private readonly store: WalletStore,
    private readonly persistence: WalletPersistenceAdapter,
  ) {}

  async getWallet(playerId: string): Promise<WalletState> {
    await this.hydratePlayer(playerId);
    return this.store.getWallet(playerId);
  }

  async addCoins(input: {
    playerId: string;
    amount: number;
  }): Promise<WalletState> {
    await this.hydratePlayer(input.playerId);
    const result = this.store.addCoins(input.playerId, input.amount);

    await this.persistWallet(input.playerId, result);
    return result;
  }

  async subtractCoins(input: {
    playerId: string;
    amount: number;
  }): Promise<WalletState> {
    await this.hydratePlayer(input.playerId);
    const result = this.store.subtractCoins(input.playerId, input.amount);

    await this.persistWallet(input.playerId, result);
    return result;
  }

  async persistWallet(playerId: string, state: WalletState): Promise<void> {
    await this.persistence.saveWallet(createPersistedWalletState(playerId, state));
  }

  async restoreWallet(playerId: string, state: WalletState): Promise<void> {
    const restored: WalletState = {
      playerId,
      schemaVersion: 1,
      balances: { ...state.balances },
    };
    this.store.replaceWallet(playerId, restored);
    this.hydratedPlayers.add(playerId);
    await this.persistWallet(playerId, restored);
  }

  async hydratePlayer(playerId: string): Promise<void> {
    if (this.hydratedPlayers.has(playerId)) return;

    const persisted = await this.persistence.loadWallet(playerId);
    if (persisted) {
      this.store.replaceWallet(playerId, persisted);
    }

    this.hydratedPlayers.add(playerId);
  }

  clearForTests(): void {
    this.hydratedPlayers.clear();
  }
}
