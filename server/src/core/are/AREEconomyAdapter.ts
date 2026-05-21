import type { EconomySystem } from "../../modules/economy/EconomySystem.js";

export type AREEconomySnapshot = {
  l: number;
  k: 1000;
  r: number;
};

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export class AREEconomyAdapter {
  constructor(private readonly economySystem: EconomySystem) {}

  public snapshotARE(): AREEconomySnapshot {
    const source: any = this.economySystem as any;
    const goldSink = safeNumber(source.goldSink ?? source.totalGoldSink ?? 0);
    const marketVolume = safeNumber(source.marketVolume ?? source.totalMarketVolume ?? 0);
    const treasury = safeNumber(source.treasury ?? source.globalTreasury ?? 0);
    const l = safeNumber(goldSink + marketVolume + treasury, 0);

    return {
      l,
      k: 1000,
      r: Math.abs(l % 1000),
    };
  }
}
