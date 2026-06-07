/**
 * JSON WALLET PERSISTENCE ADAPTER
 *
 * File-based wallet persistence for development/testing.
 * Atomic writes ensure data integrity.
 */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createPersistedWalletState,
  type WalletPersistenceAdapter,
  type PersistedWalletState,
} from "./WalletPersistence.js";
import { type WalletState } from "./WalletTypes.js";

interface WalletFile {
  schemaVersion: 1;
  players: PersistedWalletState[];
}

function stableFile(wallets: PersistedWalletState[]): WalletFile {
  return {
    schemaVersion: 1,
    players: [...wallets].sort((a, b) => a.playerId.localeCompare(b.playerId)),
  };
}

export function resolveWalletStateFilePath(): string {
  return process.env.WALLET_STATE_FILE
    ? path.resolve(process.env.WALLET_STATE_FILE)
    : path.resolve(process.cwd(), "data", "wallet-state.json");
}

export class JsonWalletPersistenceAdapter implements WalletPersistenceAdapter {
  constructor(private readonly filePath = resolveWalletStateFilePath()) {}

  async loadWallet(playerId: string): Promise<PersistedWalletState | null> {
    const file = await this.readFileSafe();
    const found = file.players.find((player) => player.playerId === playerId);
    return found ?? null;
  }

  async saveWallet(state: PersistedWalletState): Promise<void> {
    const file = await this.readFileSafe();
    const normalized = createPersistedWalletState(state.playerId, state);
    const withoutPlayer = file.players.filter((player) => player.playerId !== normalized.playerId);
    await this.writeFileAtomic(stableFile([...withoutPlayer, normalized]));
  }

  async health(): Promise<{ ok: boolean; driver: string; error?: string }> {
    try {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      return { ok: true, driver: "json" };
    } catch (error) {
      return {
        ok: false,
        driver: "json",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async readFileSafe(): Promise<WalletFile> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<WalletFile>;

      return stableFile(
        Array.isArray(parsed.players)
          ? parsed.players.map((player) => createPersistedWalletState(player.playerId, player as WalletState))
          : [],
      );
    } catch {
      return stableFile([]);
    }
  }

  private async writeFileAtomic(file: WalletFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });

    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}