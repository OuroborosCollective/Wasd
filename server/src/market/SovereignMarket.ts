import crypto from "node:crypto";
import type { DeterministicUsageStats } from "../are/DeterministicUsageTracker.js";

export type SovereignAccountStatus = "active" | "suspended";

export interface UsageCostInput {
  hashesInWindow?: number;
  hashesPerMinute?: number;
  sdkClientId?: string;
  source?: string;
}

export interface UsageCostResult {
  hashes: number;
  credits: number;
  ratePerThousandHashes: number;
  formula: string;
}

export interface SovereignAccount {
  id: string;
  displayName: string;
  credits: number;
  lifetimeHashes: number;
  lifetimeCreditsCharged: number;
  status: SovereignAccountStatus;
  lastUsageTick: number;
  lastCost: UsageCostResult | null;
  lastMessage: string | null;
}

export interface SovereignMarketStatus {
  ratePerThousandHashes: number;
  activeExternalReplits: number;
  totalCreditsGenerated: number;
  totalHashesMetered: number;
  accounts: SovereignAccount[];
  suspendedAccounts: SovereignAccount[];
}

const DEFAULT_RATE_PER_1000_HASHES = 1;
const DEFAULT_START_CREDITS = 250;

function readNumberEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function stableAccountId(source = "local-engine"): string {
  return crypto.createHash("sha256").update(source).digest("hex").slice(0, 16);
}

export function calculateUsageCost(usageData: UsageCostInput | DeterministicUsageStats): UsageCostResult {
  const hashes = Math.max(0, Math.floor(Number(usageData.hashesInWindow ?? usageData.hashesPerMinute ?? 0)));
  const ratePerThousandHashes = readNumberEnv("ARE_CREDIT_RATE_PER_1000_HASHES", DEFAULT_RATE_PER_1000_HASHES);
  const credits = Math.ceil((hashes / 1000) * ratePerThousandHashes * 1000) / 1000;
  return {
    hashes,
    credits,
    ratePerThousandHashes,
    formula: `${hashes} hashes / 1000 * ${ratePerThousandHashes} ARE`,
  };
}

export class SovereignMarket {
  private readonly accounts = new Map<string, SovereignAccount>();
  private totalCreditsGenerated = 0;
  private totalHashesMetered = 0;

  resolveAccount(source = process.env.ARE_SDK_CLIENT_ID || "local-engine", displayName = source): SovereignAccount {
    const id = stableAccountId(source);
    const existing = this.accounts.get(id);
    if (existing) return existing;
    const account: SovereignAccount = {
      id,
      displayName,
      credits: readNumberEnv("ARE_SDK_STARTING_CREDITS", DEFAULT_START_CREDITS),
      lifetimeHashes: 0,
      lifetimeCreditsCharged: 0,
      status: "active",
      lastUsageTick: 0,
      lastCost: null,
      lastMessage: null,
    };
    this.accounts.set(id, account);
    return account;
  }

  meterUsage(params: {
    usage: DeterministicUsageStats;
    tick: number;
    source?: string;
    displayName?: string;
  }): { account: SovereignAccount; cost: UsageCostResult; allowed: boolean; message: string } {
    const source = params.source || process.env.ARE_SDK_CLIENT_ID || "local-engine";
    const account = this.resolveAccount(source, params.displayName || source);
    const cost = calculateUsageCost(params.usage);
    account.lastUsageTick = params.tick;
    account.lastCost = cost;

    if (cost.credits <= 0) {
      const message = `Emily: ${account.displayName}, dein Verbrauch ist aktuell 0 ARE. Die 10-Hz-Maschine schnurrt im Leerlauf.`;
      account.lastMessage = message;
      return { account: { ...account }, cost, allowed: account.status === "active", message };
    }

    if (account.credits <= 0 || account.credits < cost.credits) {
      account.status = "suspended";
      account.credits = Math.max(0, account.credits);
      const message = `Emily: ${account.displayName}, dein ARE-Guthaben ist erschöpft. Neue deterministische Hashes sind pausiert, bis Credits nachgeladen wurden.`;
      account.lastMessage = message;
      return { account: { ...account }, cost, allowed: false, message };
    }

    account.credits = Math.round((account.credits - cost.credits) * 1000) / 1000;
    account.lifetimeHashes += cost.hashes;
    account.lifetimeCreditsCharged = Math.round((account.lifetimeCreditsCharged + cost.credits) * 1000) / 1000;
    account.status = "active";
    this.totalCreditsGenerated = Math.round((this.totalCreditsGenerated + cost.credits) * 1000) / 1000;
    this.totalHashesMetered += cost.hashes;
    const message = `Emily: ${account.displayName}, aktueller Verbrauch ${cost.credits} ARE für ${cost.hashes} deterministische Hashes. Verbleibendes Guthaben: ${account.credits} ARE.`;
    account.lastMessage = message;
    return { account: { ...account }, cost, allowed: true, message };
  }

  creditAccount(source: string, credits: number, displayName = source): SovereignAccount {
    const account = this.resolveAccount(source, displayName);
    account.credits = Math.round((account.credits + Math.max(0, credits)) * 1000) / 1000;
    if (account.credits > 0) account.status = "active";
    account.lastMessage = `Emily: ${account.displayName}, ${credits} ARE-Credits wurden gutgeschrieben.`;
    return { ...account };
  }

  getStatus(): SovereignMarketStatus {
    const accounts = [...this.accounts.values()].map((account) => ({ ...account }));
    return {
      ratePerThousandHashes: readNumberEnv("ARE_CREDIT_RATE_PER_1000_HASHES", DEFAULT_RATE_PER_1000_HASHES),
      activeExternalReplits: accounts.filter((account) => account.status === "active").length,
      totalCreditsGenerated: this.totalCreditsGenerated,
      totalHashesMetered: this.totalHashesMetered,
      accounts,
      suspendedAccounts: accounts.filter((account) => account.status === "suspended"),
    };
  }
}

export const sovereignMarket = new SovereignMarket();
