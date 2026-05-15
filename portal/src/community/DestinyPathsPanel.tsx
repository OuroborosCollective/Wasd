import React, { useMemo, useState } from "react";
import { PortalWorldHistory } from "../world/PortalWorldHistory";

type DestinyKind = "cleanse_sector" | "deliver_forge_goods" | "stabilize_anomaly" | "recover_blueprint" | "defend_core_city";
type DestinySeverity = "low" | "medium" | "high" | "critical";

interface SectorState {
  sectorId: string;
  corruption: number;
  scarcity: number;
  threat: number;
  tradePressure: number;
  selfHealingNeed: number;
}

interface DestinyPreview {
  id: string;
  kind: DestinyKind;
  title: string;
  sectorId: string;
  severity: DestinySeverity;
  rewardBlueprint: string;
  rewardQuality: "rare" | "epic" | "legendary" | "mythic";
  score: number;
  destinyHash: string;
  requirement: string;
  emilyBriefing: string;
}

const SECTORS: SectorState[] = [
  { sectorId: "12:8", corruption: 0.82, scarcity: 0.62, threat: 0.78, tradePressure: 0.28, selfHealingNeed: 0.68 },
  { sectorId: "4:4", corruption: 0.36, scarcity: 0.42, threat: 0.3, tradePressure: 0.36, selfHealingNeed: 0.91 },
  { sectorId: "9:2", corruption: 0.24, scarcity: 0.38, threat: 0.48, tradePressure: 0.82, selfHealingNeed: 0.22 },
  { sectorId: "16:11", corruption: 0.58, scarcity: 0.74, threat: 0.69, tradePressure: 0.32, selfHealingNeed: 0.43 },
];

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").repeat(8).slice(0, 64);
}

function scoreSector(sector: SectorState): number {
  return Math.max(
    0,
    Math.min(
      1,
      sector.corruption * 0.32 +
        sector.threat * 0.26 +
        sector.scarcity * 0.18 +
        sector.selfHealingNeed * 0.16 +
        sector.tradePressure * 0.08,
    ),
  );
}

function severity(score: number): DestinySeverity {
  if (score >= 0.88) return "critical";
  if (score >= 0.68) return "high";
  if (score >= 0.42) return "medium";
  return "low";
}

function quality(score: number, hash: string): DestinyPreview["rewardQuality"] {
  const wobble = Number.parseInt(hash.slice(10, 14), 16) / 0xffff;
  const combined = Math.max(0, Math.min(1, score * 0.82 + wobble * 0.18));
  if (combined >= 0.94) return "mythic";
  if (combined >= 0.78) return "legendary";
  if (combined >= 0.55) return "epic";
  return "rare";
}

function chooseKind(sector: SectorState, score: number, hash: string): DestinyKind {
  const gate = Number.parseInt(hash.slice(0, 2), 16) % 100;
  if (sector.corruption >= 0.7 || gate < 22) return "cleanse_sector";
  if (sector.selfHealingNeed >= 0.62 || gate < 44) return "stabilize_anomaly";
  if (sector.tradePressure >= 0.58 || gate < 62) return "deliver_forge_goods";
  if (score >= 0.82 || gate < 80) return "defend_core_city";
  return "recover_blueprint";
}

function destinyTitle(kind: DestinyKind, sectorId: string): string {
  switch (kind) {
    case "cleanse_sector":
      return `Säuberung von Sektor ${sectorId}`;
    case "deliver_forge_goods":
      return `Liefere 5 Sovereign Circuit nach Sektor ${sectorId}`;
    case "stabilize_anomaly":
      return `Stabilisiere die Anomalie in Sektor ${sectorId}`;
    case "recover_blueprint":
      return `Berge verlorene Blaupause in Sektor ${sectorId}`;
    case "defend_core_city":
      return `Verteidige den Kernkorridor bei Sektor ${sectorId}`;
    default:
      return `Destiny-Pfad ${sectorId}`;
  }
}

function rewardName(kind: DestinyKind, hash: string): string {
  const pools: Record<DestinyKind, string[]> = {
    cleanse_sector: ["Blueprint: Echo Blade", "Blueprint: Guardian Edge", "Blueprint: Sunfire Cleaver"],
    deliver_forge_goods: ["Blueprint: Sovereign Circuit", "Blueprint: Trade Resonator", "Blueprint: City Grid Core"],
    stabilize_anomaly: ["Blueprint: Ouroboros Anvil Core", "Blueprint: Causality Suture", "Blueprint: Heal Matrix Key"],
    recover_blueprint: ["Blueprint: Lost Oracle Schema", "Blueprint: Void Cartographer", "Blueprint: Echo Compass"],
    defend_core_city: ["Blueprint: Bastion Shield", "Blueprint: Warfront Anchor", "Blueprint: Crown Wall Gate"],
  };
  const list = pools[kind];
  return list[Number.parseInt(hash.slice(18, 20), 16) % list.length];
}

function requirement(kind: DestinyKind, sectorId: string): string {
  switch (kind) {
    case "cleanse_sector":
      return `Besiege 8 hostile entities in ${sectorId}`;
    case "deliver_forge_goods":
      return `Liefere 5 Sovereign Circuit zur Kern-Stadt`;
    case "stabilize_anomaly":
      return `Aktiviere 2 SelfHeal-Routinen in ${sectorId}`;
    case "recover_blueprint":
      return `Öffne 1 verlorenen Oracle-Cache`;
    case "defend_core_city":
      return `Halte 6 Warfront-Ticks ohne Strukturverlust`;
    default:
      return "Erfülle die Kausalitätsbedingung";
  }
}

function createDestiny(seed: string, worldHash: string, tick: number, sector: SectorState): DestinyPreview {
  const score = scoreSector(sector);
  const destinyHash = fnv1a(["ARE_DESTINY", seed, worldHash, tick, sector.sectorId, score.toFixed(5)].join("|"));
  const kind = chooseKind(sector, score, destinyHash);
  const rewardBlueprint = rewardName(kind, destinyHash);
  const rewardQuality = quality(score, destinyHash);
  const sev = severity(score);
  const title = destinyTitle(kind, sector.sectorId);
  return {
    id: `destiny_${destinyHash.slice(0, 12)}`,
    kind,
    title,
    sectorId: sector.sectorId,
    severity: sev,
    rewardBlueprint,
    rewardQuality,
    score,
    destinyHash,
    requirement: requirement(kind, sector.sectorId),
    emilyBriefing: `Architekt Thomas, Emily erkennt einen ${sev.toUpperCase()} Riss im Grid von Sektor ${sector.sectorId}. Schicksalspfad: ${title}. Bei Erfüllung manifestiert die Kausalität garantiert ${rewardBlueprint} (${rewardQuality}).`,
  };
}

export const DestinyPathsPanel: React.FC = () => {
  const [tick, setTick] = useState(1000);
  const [worldHash, setWorldHash] = useState("world-alpha-destiny");
  const hist = useMemo(() => PortalWorldHistory.getInstance(), []);

  const paths = useMemo(() => {
    return SECTORS.map((sector) => createDestiny("ARE|DESTINY|ALPHA", worldHash, tick, sector)).sort((a, b) => b.score - a.score);
  }, [tick, worldHash]);

  return (
    <section className="rounded-xl border border-violet-300/50 bg-violet-950/20 p-4 text-slate-100 shadow-[0_0_22px_rgba(190,160,255,0.18)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-violet-200">DESTINY</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-300">
            Emily analysiert WorldHash, Sector-State und Tick-Phase und schlägt deterministische Schicksals-Pfade vor.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-violet-300/50 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-500/25"
          onClick={() => setTick((value) => value + 10)}
        >
          Advance 10 ticks
        </button>
      </div>

      <div className="mb-3 grid gap-2 text-xs md:grid-cols-2">
        <label className="rounded-lg border border-white/10 bg-black/25 p-2">
          <span className="block text-slate-400">worldHash</span>
          <input
            value={worldHash}
            onChange={(event) => setWorldHash(event.target.value)}
            className="mt-1 w-full rounded bg-black/40 px-2 py-1 font-mono text-violet-100 outline-none ring-1 ring-violet-300/20 focus:ring-violet-200/60"
          />
        </label>
        <div className="rounded-lg border border-white/10 bg-black/25 p-2 font-mono">
          <div className="text-slate-400">tick</div>
          <div className="text-lg text-violet-100">{tick}</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {paths.map((path) => (
          <article key={path.id} className="rounded-xl border border-violet-200/30 bg-black/30 p-3 shadow-[inset_0_0_18px_rgba(148,113,255,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-violet-100">{path.title}</h4>
                <p className="mt-1 text-xs text-slate-400">{path.requirement}</p>
              </div>
              <span className="rounded-full border border-violet-200/40 px-2 py-1 text-[10px] uppercase tracking-widest text-violet-100">
                {path.severity}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300">
              <div className="rounded bg-black/30 p-2">
                <div className="text-slate-500">score</div>
                <div>{path.score.toFixed(4)}</div>
              </div>
              <div className="rounded bg-black/30 p-2">
                <div className="text-slate-500">reward</div>
                <div className="text-amber-200">{path.rewardQuality}</div>
              </div>
            </div>

            <p className="mt-3 text-xs text-violet-100">{path.emilyBriefing}</p>
            <p className="mt-2 break-all font-mono text-[10px] text-slate-500">{path.destinyHash.slice(0, 32)}…</p>

            <button
              type="button"
              className="mt-3 rounded border border-violet-300/50 bg-violet-400/15 px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-400/25"
              onClick={() => {
                hist.pushEcho({
                  kind: "destiny",
                  summary: `Destiny path released · ${path.title} · reward ${path.rewardQuality.toUpperCase()} ${path.rewardBlueprint}`,
                  worldLine: {
                    title: `Destiny released · ${path.severity.toUpperCase()}`,
                    description: path.emilyBriefing,
                  },
                });
              }}
            >
              Release path
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default DestinyPathsPanel;
