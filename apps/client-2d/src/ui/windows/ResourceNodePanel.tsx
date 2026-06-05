/**
 * Resource Node Panel
 *
 * Displays deterministic resource nodes from LiveGameplaySnapshot.
 * Shows available/depleted status and respawn timers.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 */

import React from "react";
import type { ResourceNodeSnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  resources: ResourceNodeSnapshot[];
}

const kindIcons: Record<string, string> = {
  tree: "🌲",
  ore: "⛏️",
  fish_spot: "🎣",
};

const kindLabels: Record<string, string> = {
  tree: "Woodcutting",
  ore: "Mining",
  fish_spot: "Fishing",
};

export function ResourceNodePanel({ resources }: Props) {
  if (!resources.length) {
    return (
      <section data-testid="resource-panel-empty" className="are-window">
        <h2>Resources</h2>
        <p className="are-text-muted">No live resource nodes yet.</p>
      </section>
    );
  }

  return (
    <section data-testid="resource-panel-live" className="are-window">
      <h2>Resources</h2>

      <div className="resource-list">
        {resources.map((node) => (
          <article
            key={node.id}
            className={`resource-row ${node.status === "depleted" ? "resource-row--depleted" : ""}`}
          >
            <div className="resource-row__header">
              <span className="resource-row__icon" title={node.kind}>
                {kindIcons[node.kind] ?? "?"}
              </span>
              <strong className="resource-row__title">{node.title}</strong>
              <span className="resource-row__kind">{kindLabels[node.kind] ?? node.kind}</span>
            </div>

            <div className="resource-row__meta">
              <span className="resource-row__xp">+{node.xpReward} XP</span>
              <span className="resource-row__separator">·</span>
              <span className="resource-row__reward">{node.itemRewardName}</span>
            </div>

            <div className="resource-row__status">
              {node.status === "available" ? (
                <span className="resource-row__status--available">Available</span>
              ) : (
                <span className="resource-row__status--depleted">
                  Respawns in {node.remainingTicks} ticks
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}