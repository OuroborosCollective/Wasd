/**
 * Ouroboros CharacterWindow — WoW-Style Character Sheet
 * 
 * Shows player level, XP progress, and core stats with allocation buttons.
 * Follows the Panzerschrank brutalist design aesthetic.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSyncExternalStore } from "react";
import "../inventoryGrid.css";

export type CoreStatKey = "strength" | "agility" | "intelligence";

export interface CoreStats {
  strength: number;
  agility: number;
  intelligence: number;
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, { xp: number; level: number; nextLevelXP: number; progressPercent: number }>;
  coreStats: CoreStats;
  unspentStatPoints: number;
  totalLevel: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  gold: number;
  level: number;
}

// ─── State Store ─────────────────────────────────────────────────────────────

class CharacterWindowStore {
  private snapshot: PlayerStatsSnapshot | null = null;
  private listeners = new Set<() => void>();

  getSnapshot() { return this.snapshot; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receiveSnapshot(snap: PlayerStatsSnapshot): void {
    this.snapshot = snap;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const characterWindowStore = new CharacterWindowStore();

export function useCharacterWindow(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    (l) => characterWindowStore.subscribe(l),
    () => characterWindowStore.getSnapshot(),
    () => null
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STAT_LABELS: Record<CoreStatKey, string> = {
  strength: "STR",
  agility: "AGI",
  intelligence: "INT",
};

const STAT_NAMES: Record<CoreStatKey, string> = {
  strength: "Strength",
  agility: "Agility",
  intelligence: "Intelligence",
};

// ─── Components ──────────────────────────────────────────────────────────────

interface StatDisplayProps {
  stat: CoreStatKey;
  value: number;
  canAllocate: boolean;
  onAllocate: (stat: CoreStatKey) => void;
}

function StatDisplay({ stat, value, canAllocate, onAllocate }: StatDisplayProps) {
  return (
    <div className="char-stat-row">
      <span className="char-stat-label">{STAT_LABELS[stat]}</span>
      <span className="char-stat-value">{value}</span>
      {canAllocate && (
        <button
          className="char-stat-btn"
          onClick={() => onAllocate(stat)}
          aria-label={`Allocate point to ${STAT_NAMES[stat]}`}
        >
          +
        </button>
      )}
    </div>
  );
}

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color?: string;
}

function StatBar({ label, current, max, color = "#c8b878" }: StatBarProps) {
  const percent = Math.min(100, (current / max) * 100);
  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="char-bar-track">
        <div
          className="char-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CharacterWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CharacterWindow({ isOpen = true, onClose }: CharacterWindowProps) {
  const snapshot = useCharacterWindow();
  const [allocating, setAllocating] = useState(false);

  // Listen for stats updates
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "player_stats_snapshot") {
        characterWindowStore.receiveSnapshot(detail.payload);
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  const handleAllocate = useCallback((stat: CoreStatKey) => {
    if (!snapshot || snapshot.unspentStatPoints <= 0) return;

    const intent = {
      intent: "stat_alloc" as const,
      playerId: snapshot.playerId,
      stat,
      tick: Date.now(),
    };

    window.dispatchEvent(new CustomEvent("wasd:client-action", {
      detail: { action: "stat_allocation", payload: intent },
    }));

    setAllocating(true);
    setTimeout(() => setAllocating(false), 500);
  }, [snapshot]);

  if (!isOpen) return null;

  const stats = snapshot?.coreStats ?? { strength: 10, agility: 10, intelligence: 10 };
  const unspentPoints = snapshot?.unspentStatPoints ?? 0;
  const level = snapshot?.level ?? 1;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Character">
      <div className="wow-inventory-header">
        <h2>CHARACTER</h2>
        {onClose && (
          <button className="wow-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        {unspentPoints > 0 && (
          <div className="char-unspent-badge">{unspentPoints} Points</div>
        )}
      </div>

      <div className="char-content">
        {/* Level Section */}
        <section className="char-section">
          <div className="char-level-display">
            <span className="char-level-label">Level</span>
            <span className="char-level-value">{level}</span>
          </div>
          {snapshot && (
            <StatBar
              label="XP"
              current={snapshot.totalLevel}
              max={snapshot.totalLevel + 100}
              color="#9ac0ff"
            />
          )}
        </section>

        {/* Vital Bars */}
        <section className="char-section">
          <h3>Vitals</h3>
          {snapshot && (
            <>
              <StatBar label="HP" current={snapshot.hp} max={snapshot.maxHp} color="#e04040" />
              <StatBar label="Mana" current={snapshot.mana} max={snapshot.maxMana} color="#4080ff" />
              <StatBar label="Stamina" current={snapshot.stamina} max={snapshot.maxStamina} color="#40c040" />
            </>
          )}
        </section>

        {/* Core Stats */}
        <section className="char-section">
          <h3>Attributes</h3>
          <div className="char-stats-grid">
            {(["strength", "agility", "intelligence"] as CoreStatKey[]).map((stat) => (
              <StatDisplay
                key={stat}
                stat={stat}
                value={stats[stat]}
                canAllocate={unspentPoints > 0}
                onAllocate={handleAllocate}
              />
            ))}
          </div>
        </section>

        {/* Resource Display */}
        <section className="char-section">
          <h3>Resources</h3>
          <div className="char-resource-row">
            <span className="char-resource-icon">💰</span>
            <span className="char-resource-value">{snapshot?.gold ?? 0} Gold</span>
          </div>
        </section>
      </div>

      {allocating && (
        <div className="wow-pending-indicator">
          <span>⟳</span> Allocating...
        </div>
      )}
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

export function mountCharacterWindow(containerId = "character-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Character mount point #${containerId} not found`);
    return;
  }

  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<CharacterWindow />);
  });
}