import React, { useMemo, useState } from "react";
import { PortalWorldHistory } from "../world/PortalWorldHistory";

type EssenceKind = "commonEssence" | "arcaneEssence" | "sovereignEssence" | "legendaryResidue";
type Wallet = Record<EssenceKind, number>;
type Quality = "rare" | "epic" | "legendary";

interface Blueprint {
  id: string;
  name: string;
  quality: Quality;
  resultName: string;
  resultItemId: string;
  resultTier: number;
  ingredients: Partial<Wallet>;
  sectorAffinity?: string;
}

interface ForgeResult {
  ok: boolean;
  forgeHash: string;
  stability: number;
  summary: string;
}

const blueprints: Blueprint[] = [
  {
    id: "bp_echo_blade_t2",
    name: "Blueprint: Echo Blade",
    quality: "rare",
    resultName: "Echo Blade",
    resultItemId: "echo_blade",
    resultTier: 2,
    ingredients: { commonEssence: 8, arcaneEssence: 3 },
  },
  {
    id: "bp_sovereign_circuit_t4",
    name: "Blueprint: Sovereign Circuit",
    quality: "epic",
    resultName: "Sovereign Circuit",
    resultItemId: "sovereign_circuit",
    resultTier: 4,
    ingredients: { commonEssence: 14, arcaneEssence: 8, sovereignEssence: 2 },
    sectorAffinity: "12:8",
  },
  {
    id: "bp_ouroboros_anvil_t5",
    name: "Blueprint: Ouroboros Anvil Core",
    quality: "legendary",
    resultName: "Ouroboros Anvil Core",
    resultItemId: "ouroboros_anvil_core",
    resultTier: 5,
    ingredients: { commonEssence: 32, arcaneEssence: 16, sovereignEssence: 5, legendaryResidue: 1 },
    sectorAffinity: "12:8",
  },
];

const zeroWallet: Wallet = {
  commonEssence: 0,
  arcaneEssence: 0,
  sovereignEssence: 0,
  legendaryResidue: 0,
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

function canAfford(wallet: Wallet, blueprint: Blueprint): boolean {
  return (Object.entries(blueprint.ingredients) as Array<[EssenceKind, number]>).every(
    ([kind, amount]) => wallet[kind] >= amount,
  );
}

function spend(wallet: Wallet, blueprint: Blueprint): Wallet {
  return {
    commonEssence: wallet.commonEssence - (blueprint.ingredients.commonEssence ?? 0),
    arcaneEssence: wallet.arcaneEssence - (blueprint.ingredients.arcaneEssence ?? 0),
    sovereignEssence: wallet.sovereignEssence - (blueprint.ingredients.sovereignEssence ?? 0),
    legendaryResidue: wallet.legendaryResidue - (blueprint.ingredients.legendaryResidue ?? 0),
  };
}

function formatWallet(wallet: Partial<Wallet>): string {
  return (Object.entries(wallet) as Array<[EssenceKind, number]>)
    .filter(([, amount]) => amount > 0)
    .map(([kind, amount]) => `${amount} ${kind}`)
    .join(", ") || "0 essence";
}

function forgeBlueprint(blueprint: Blueprint, tick: number): ForgeResult {
  const forgeHash = stableHash(`ARE_FORGE|${blueprint.id}|${blueprint.resultItemId}|${blueprint.quality}|12:8|${tick}|architect-thomas`);
  const jitter = Number.parseInt(forgeHash.slice(4, 10), 16) % 900;
  const base = blueprint.quality === "legendary" ? 0.88 : blueprint.quality === "epic" ? 0.91 : 0.94;
  const stability = Math.min(1, base + jitter / 10000);
  return {
    ok: true,
    forgeHash,
    stability,
    summary: `Schmiedevorgang stabil. Blueprint-Kausalität bei ${(stability * 100).toFixed(2)}%.`,
  };
}

const qualityClass: Record<Quality, string> = {
  rare: "border-violet-400/40 text-violet-100",
  epic: "border-fuchsia-400/50 text-fuchsia-100",
  legendary: "border-amber-300/70 text-amber-100",
};

export default function ForgePanel(): React.ReactElement {
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);
  const [selectedId, setSelectedId] = useState(blueprints[0].id);
  const [wallet, setWallet] = useState<Wallet>({ commonEssence: 46, arcaneEssence: 22, sovereignEssence: 7, legendaryResidue: 1 });
  const [crafted, setCrafted] = useState<Array<{ name: string; quality: Quality; hash: string }>>([]);
  const [tick, setTick] = useState(1000);
  const [report, setReport] = useState("Emily: Forge hot. Blueprint matrix waiting for causality lock.");

  const selected = blueprints.find((bp) => bp.id === selectedId) ?? blueprints[0];
  const affordable = canAfford(wallet, selected);

  function craft(): void {
    if (!affordable) {
      setReport(`Emily: Schmiede blockiert. Benötigt: ${formatWallet(selected.ingredients)}.`);
      return;
    }
    const result = forgeBlueprint(selected, tick);
    const forgedId = `${selected.resultItemId}:${result.forgeHash.slice(0, 12)}`;
    setWallet((current) => spend(current, selected));
    setTick((current) => current + 1);
    setCrafted((current) => [{ name: selected.resultName, quality: selected.quality, hash: result.forgeHash }, ...current].slice(0, 6));
    const emily = `Emily: ${result.summary} ${selected.resultName} wurde in Sektor 12:8 manifestiert.`;
    setReport(emily);
    hist.recordForge({
      blueprintId: selected.id,
      blueprintName: selected.name,
      itemId: forgedId,
      itemName: selected.resultName,
      quality: selected.quality,
      sector: "12:8",
      stability: result.stability,
      forgeHash: result.forgeHash,
    });
  }

  return (
    <section className="rounded-xl border border-blue-300/40 bg-slate-950/85 p-4 shadow-[0_0_22px_rgba(0,183,255,0.18)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-blue-200">FORGE</h3>
          <p className="mt-1 text-xs text-slate-400">AREForge · essence + blueprint · deterministic creation</p>
        </div>
        <button
          type="button"
          disabled={!affordable}
          onClick={craft}
          className="rounded border border-blue-300/60 bg-blue-950/60 px-3 py-1 text-[11px] font-semibold text-blue-100 hover:bg-blue-900/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Forge Item
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-2">
          {blueprints.map((bp) => (
            <button
              type="button"
              key={bp.id}
              onClick={() => setSelectedId(bp.id)}
              className={`w-full rounded-lg border bg-black/25 p-3 text-left transition ${qualityClass[bp.quality]} ${selectedId === bp.id ? "shadow-[0_0_18px_rgba(0,183,255,0.28)] ring-1 ring-blue-300/50" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{bp.name}</div>
                  <div className="font-mono text-[10px] uppercase text-slate-500">
                    result: {bp.resultName} · tier {bp.resultTier} · {bp.quality}
                  </div>
                </div>
                <span className="rounded bg-blue-950/60 px-2 py-1 font-mono text-[10px] text-blue-100">
                  {formatWallet(bp.ingredients)}
                </span>
              </div>
            </button>
          ))}
        </div>

        <aside className="rounded-lg border border-blue-300/20 bg-black/30 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-200">Essence Furnace</h4>
          {(Object.entries(wallet) as Array<[EssenceKind, number]>).map(([kind, amount]) => (
            <div key={kind} className="mb-2 flex items-center justify-between gap-2 font-mono text-[11px]">
              <span className="text-slate-400">{kind}</span>
              <span className="text-blue-100">{amount}</span>
            </div>
          ))}
          <div className="mt-3 rounded border border-blue-300/20 bg-blue-950/20 p-2 font-mono text-[10px] text-blue-100">
            {report}
          </div>
        </aside>
      </div>

      {crafted.length > 0 ? (
        <div className="mt-3 rounded-lg border border-blue-300/20 bg-black/25 p-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-200">Crafted Artifacts</h4>
          <div className="space-y-2">
            {crafted.map((item) => (
              <div key={item.hash} className="flex flex-wrap items-center justify-between gap-2 rounded border border-blue-300/20 bg-blue-950/20 px-2 py-1 text-xs">
                <span className="text-blue-100">{item.quality.toUpperCase()} · {item.name}</span>
                <code className="text-[10px] text-slate-400">{item.hash.slice(0, 18)}</code>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
