import React, { useMemo, useState } from "react";
import { PortalWorldHistory } from "../world/PortalWorldHistory";

type Quality = "common" | "magic" | "rare" | "epic" | "legendary";
type EssenceKind = "commonEssence" | "arcaneEssence" | "sovereignEssence" | "legendaryResidue";
type Wallet = Record<EssenceKind, number>;

interface InventoryItem {
  itemId: string;
  name: string;
  quality: Quality;
  tier: number;
  quantity: number;
  rollHash: string;
}

interface RefinementResult {
  yields: Wallet;
  residueHash: string;
  summary: string;
}

const initialInventory: InventoryItem[] = [
  { itemId: "rusted_blade", name: "Rusted Blade", quality: "common", tier: 1, quantity: 1, rollHash: "inv-rusted-blade-001" },
  { itemId: "iron_scale", name: "Iron Scale", quality: "magic", tier: 2, quantity: 3, rollHash: "inv-iron-scale-002" },
  { itemId: "oracle_rune", name: "Oracle Rune", quality: "rare", tier: 3, quantity: 1, rollHash: "inv-oracle-rune-003" },
  { itemId: "warden_relic", name: "Warden Relic", quality: "epic", tier: 4, quantity: 1, rollHash: "inv-warden-relic-004" },
];

const zeroWallet: Wallet = {
  commonEssence: 0,
  arcaneEssence: 0,
  sovereignEssence: 0,
  legendaryResidue: 0,
};

const qualityPower: Record<Quality, number> = {
  common: 1,
  magic: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
};

function stableHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function hashRange(hash: string, offset: number, modulo: number): number {
  return Number.parseInt(hash.slice(offset, offset + 8).padEnd(8, "0"), 16) % Math.max(1, modulo);
}

function decomposeItem(item: InventoryItem, tick: number): RefinementResult {
  const residueHash = stableHash(`ARE_REFINE|${item.itemId}|${item.quality}|${item.tier}|${item.quantity}|${item.rollHash}|${tick}|12:8`);
  const base = Math.max(1, item.tier) * Math.max(1, item.quantity);
  const power = qualityPower[item.quality];
  const yields: Wallet = { ...zeroWallet };
  yields.commonEssence = Math.max(1, base + hashRange(residueHash, 0, Math.max(2, power)));
  if (["magic", "rare", "epic", "legendary"].includes(item.quality)) {
    yields.arcaneEssence = Math.max(1, Math.floor((base * power) / 4) + hashRange(residueHash, 4, 3));
  }
  if (["epic", "legendary"].includes(item.quality)) {
    yields.sovereignEssence = Math.max(1, Math.floor((base * power) / 12) + hashRange(residueHash, 8, 2));
  }
  if (item.quality === "legendary") {
    yields.legendaryResidue = Math.max(1, Math.floor((base * power) / 24) + hashRange(residueHash, 12, 2));
  }
  return { yields, residueHash, summary: formatWallet(yields) };
}

function formatWallet(wallet: Partial<Wallet>): string {
  return (Object.entries(wallet) as Array<[EssenceKind, number]>)
    .filter(([, amount]) => amount > 0)
    .map(([kind, amount]) => `${amount} ${kind}`)
    .join(", ") || "0 essence";
}

function addWallet(a: Wallet, b: Partial<Wallet>): Wallet {
  return {
    commonEssence: a.commonEssence + Math.max(0, Math.floor(b.commonEssence ?? 0)),
    arcaneEssence: a.arcaneEssence + Math.max(0, Math.floor(b.arcaneEssence ?? 0)),
    sovereignEssence: a.sovereignEssence + Math.max(0, Math.floor(b.sovereignEssence ?? 0)),
    legendaryResidue: a.legendaryResidue + Math.max(0, Math.floor(b.legendaryResidue ?? 0)),
  };
}

function spendBuff(wallet: Wallet): { wallet: Wallet; summary: string } {
  const spend = {
    commonEssence: Math.min(wallet.commonEssence, 12),
    arcaneEssence: Math.min(wallet.arcaneEssence, 6),
    sovereignEssence: Math.min(wallet.sovereignEssence, 2),
    legendaryResidue: Math.min(wallet.legendaryResidue, 1),
  };
  const next = {
    commonEssence: wallet.commonEssence - spend.commonEssence,
    arcaneEssence: wallet.arcaneEssence - spend.arcaneEssence,
    sovereignEssence: wallet.sovereignEssence - spend.sovereignEssence,
    legendaryResidue: wallet.legendaryResidue - spend.legendaryResidue,
  };
  const power = spend.commonEssence + spend.arcaneEssence * 3 + spend.sovereignEssence * 9 + spend.legendaryResidue * 25;
  return {
    wallet: next,
    summary: `Next-tick essence buff armed · power=${power} · noDrop≈-${Math.min(28, power / 2).toFixed(1)}% · rare+ ${(power / 180).toFixed(3)}x`,
  };
}

const qualityClass: Record<Quality, string> = {
  common: "border-slate-500/40 text-slate-100",
  magic: "border-cyan-400/40 text-cyan-100",
  rare: "border-violet-400/40 text-violet-100",
  epic: "border-fuchsia-400/50 text-fuchsia-100",
  legendary: "border-amber-300/70 text-amber-100",
};

export default function InventoryRefinementPanel(): React.ReactElement {
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [wallet, setWallet] = useState<Wallet>({ commonEssence: 4, arcaneEssence: 1, sovereignEssence: 0, legendaryResidue: 0 });
  const [lastReport, setLastReport] = useState<string>("Emily: Refinement bay standing by. Schrott wartet auf Verwandlung.");
  const [tick, setTick] = useState(840);

  const canBuff = wallet.commonEssence + wallet.arcaneEssence + wallet.sovereignEssence + wallet.legendaryResidue > 0;

  function refine(item: InventoryItem): void {
    const result = decomposeItem(item, tick);
    setTick((current) => current + 1);
    setWallet((current) => addWallet(current, result.yields));
    setInventory((current) => current.filter((candidate) => candidate.rollHash !== item.rollHash));
    const emily = `Emily: Architekt Thomas, ${item.name} wurde in Sektor 12:8 kontrolliert zerlegt. Molekularer Zerfall stabil. Gewonnen: ${result.summary}.`;
    setLastReport(emily);
    hist.recordRefinement({
      itemId: item.itemId,
      itemName: item.name,
      quality: item.quality,
      sector: "12:8",
      yields: result.summary,
      residueHash: result.residueHash,
    });
  }

  function armBuff(): void {
    const next = spendBuff(wallet);
    setWallet(next.wallet);
    setLastReport(`Emily: ${next.summary}. Die nächste Kausalitätsfalte ist vorbereitet.`);
    hist.recordNpcTradeComplete(`Essence buff armed · ${next.summary}`);
  }

  return (
    <section className="rounded-xl border border-lime-400/30 bg-slate-950/80 p-4 shadow-[0_0_20px_rgba(57,255,20,0.12)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-lime-200">Inventory & Refinement</h3>
          <p className="mt-1 text-xs text-slate-400">Alchemical Refiner · deterministic salvage · next-tick essence buff</p>
        </div>
        <button
          type="button"
          disabled={!canBuff}
          onClick={armBuff}
          className="rounded border border-lime-300/50 bg-lime-950/50 px-3 py-1 text-[11px] font-semibold text-lime-100 hover:bg-lime-900/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Arm Essence Buff
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-2">
          {inventory.length === 0 ? (
            <div className="rounded border border-dashed border-slate-700 p-4 text-sm text-slate-500">Inventory empty. Die Esse glüht weiter.</div>
          ) : (
            inventory.map((item) => (
              <div key={item.rollHash} className={`rounded-lg border bg-black/25 p-3 ${qualityClass[item.quality]}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="font-mono text-[10px] uppercase text-slate-500">{item.quality} · tier {item.tier} · qty {item.quantity}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => refine(item)}
                    className="rounded border border-lime-300/40 bg-lime-950/40 px-2 py-1 text-[11px] font-semibold text-lime-100 hover:bg-lime-900/60"
                  >
                    Decompose
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="rounded-lg border border-lime-300/20 bg-black/30 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-lime-200">Material Wallet</h4>
          {(Object.entries(wallet) as Array<[EssenceKind, number]>).map(([kind, amount]) => (
            <div key={kind} className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-slate-400">{kind}</span>
              <span className="text-lime-100">{amount}</span>
            </div>
          ))}
          <div className="mt-3 rounded border border-lime-300/20 bg-lime-950/20 p-2 font-mono text-[10px] text-lime-100">
            {lastReport}
          </div>
        </aside>
      </div>
    </section>
  );
}
