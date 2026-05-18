import React, { useMemo, useState } from "react";
import { rollDefaultAreloriaLoot, type LootDrop } from "@wasd/core-logic/loot";

interface LootStats {
  iterations: number;
  totalDrops: number;
  qualityCounts: Record<string, number>;
  itemCounts: Record<string, number>;
  highTierDrops: LootDrop[];
  lastHash: string;
}

const ROOT_TC = "tc_oracle_cache";
const ITERATIONS = 10_000;

function runLootSimulation(): LootStats {
  const qualityCounts: Record<string, number> = {};
  const itemCounts: Record<string, number> = {};
  const highTierDrops: LootDrop[] = [];
  let totalDrops = 0;
  let lastHash = "boot";

  for (let i = 0; i < ITERATIONS; i += 1) {
    const result = rollDefaultAreloriaLoot(ROOT_TC, {
      seed: "ARE|sdk|loot-simulator|alpha",
      worldHash: `world-${Math.floor(i / 100)}`,
      chunkHash: `chunk-12-8-${i % 64}`,
      chunkId: "12:8",
      tick: i,
      actorId: "replit-developer",
      sourceId: ROOT_TC,
      playerPublicKey: "sdk-public-key-demo",
    });

    lastHash = result.finalHash;
    for (const drop of result.drops) {
      totalDrops += drop.quantity;
      qualityCounts[drop.quality] = (qualityCounts[drop.quality] ?? 0) + drop.quantity;
      itemCounts[drop.itemId] = (itemCounts[drop.itemId] ?? 0) + drop.quantity;
      if (["epic", "legendary", "mythic"].includes(drop.quality)) {
        highTierDrops.push(drop);
      }
    }
  }

  return { iterations: ITERATIONS, totalDrops, qualityCounts, itemCounts, highTierDrops: highTierDrops.slice(-12), lastHash };
}

export function LootSimulator(): JSX.Element {
  const initial = useMemo(() => runLootSimulation(), []);
  const [stats, setStats] = useState<LootStats>(initial);

  const qualityRows = Object.entries(stats.qualityCounts).sort(([a], [b]) => a.localeCompare(b));
  const itemRows = Object.entries(stats.itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <section className="loot-sim">
      <div className="loot-head">
        <div>
          <p className="eyebrow">Treasure Matrix Lab</p>
          <h2>Loot Simulator · 10,000 deterministic rolls</h2>
        </div>
        <button type="button" onClick={() => setStats(runLootSimulation())}>
          Re-run Matrix
        </button>
      </div>

      <div className="loot-grid">
        <div className="metric">
          <span>Root TC</span>
          <strong>{ROOT_TC}</strong>
        </div>
        <div className="metric">
          <span>Iterations</span>
          <strong>{stats.iterations.toLocaleString()}</strong>
        </div>
        <div className="metric">
          <span>Total drops</span>
          <strong>{stats.totalDrops.toLocaleString()}</strong>
        </div>
        <div className="metric">
          <span>Last finalHash</span>
          <strong>{stats.lastHash.slice(0, 16)}</strong>
        </div>
      </div>

      <div className="loot-columns">
        <div>
          <h3>Quality Distribution</h3>
          {qualityRows.map(([quality, count]) => (
            <div className="bar-row" key={quality}>
              <span>{quality}</span>
              <meter min={0} max={stats.totalDrops || 1} value={count} />
              <code>{((count / Math.max(1, stats.totalDrops)) * 100).toFixed(4)}%</code>
            </div>
          ))}
        </div>
        <div>
          <h3>Top Items</h3>
          {itemRows.map(([itemId, count]) => (
            <div className="bar-row" key={itemId}>
              <span>{itemId}</span>
              <meter min={0} max={stats.totalDrops || 1} value={count} />
              <code>{count}</code>
            </div>
          ))}
        </div>
      </div>

      <div className="high-tier">
        <h3>Recent High-Tier Echoes</h3>
        {stats.highTierDrops.length === 0 ? (
          <p>No epic-or-better drops in this deterministic sample.</p>
        ) : (
          stats.highTierDrops.map((drop, index) => (
            <div className="drop-card" key={`${drop.rollHash}-${index}`}>
              <strong>{drop.quality.toUpperCase()} · {drop.name}</strong>
              <code>{drop.rollHash.slice(0, 24)}</code>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
