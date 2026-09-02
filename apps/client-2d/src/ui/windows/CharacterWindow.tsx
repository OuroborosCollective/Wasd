/**
 * Ouroboros CharacterWindow — WoW-Style Character Sheet
 *
 * Shows player level, total level, core stats, vitals, gold, and equipment panel.
 * Includes Paper-Doll equipment display with touch-safe drag & drop.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * Determinism rule:
 * - Client does NOT stamp Date.now() into gameplay intents.
 * - Server owns tick, validation, stat mutation, and snapshot broadcast.
 */

import { useCallback, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useSyncExternalStore } from "react";
import { EquipmentPanel } from "./EquipmentPanel";
import "../inventoryGrid.css";
import "./equipmentPanel.css";

export type CoreStatKey = "strength" | "agility" | "intelligence";

export interface CoreStats {
  strength: number;
  agility: number;
  intelligence: number;
}

export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number;
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, SkillSnapshot>;
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
  private readonly listeners = new Set<() => void>();

  getSnapshot(): PlayerStatsSnapshot | null {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  receiveSnapshot(snap: PlayerStatsSnapshot): void {
    this.snapshot = sanitizeSnapshot(snap);
    this.notify();
  }

  clear(): void {
    this.snapshot = null;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const characterWindowStore = new CharacterWindowStore();

export function useCharacterWindow(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    (listener) => characterWindowStore.subscribe(listener),
    () => characterWindowStore.getSnapshot(),
    () => null
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CORE_STATS: CoreStats = {
  strength: 10,
  agility: 10,
  intelligence: 10,
};

const CORE_STAT_KEYS: readonly CoreStatKey[] = [
  "strength",
  "agility",
  "intelligence",
];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clampNumber(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, value);
}

function sanitizeCoreStats(stats: unknown): CoreStats {
  const raw = stats as Partial<CoreStats> | null | undefined;

  return {
    strength: clampNumber(raw?.strength, DEFAULT_CORE_STATS.strength),
    agility: clampNumber(raw?.agility, DEFAULT_CORE_STATS.agility),
    intelligence: clampNumber(raw?.intelligence, DEFAULT_CORE_STATS.intelligence),
  };
}

function sanitizeSnapshot(snap: PlayerStatsSnapshot): PlayerStatsSnapshot {
  const hp = clampNumber(snap.hp, 0);
  const maxHp = Math.max(1, clampNumber(snap.maxHp, 1));

  const mana = clampNumber(snap.mana, 0);
  const maxMana = Math.max(1, clampNumber(snap.maxMana, 1));

  const stamina = clampNumber(snap.stamina, 0);
  const maxStamina = Math.max(1, clampNumber(snap.maxStamina, 1));

  return {
    ...snap,
    playerId: String(snap.playerId ?? ""),
    skills: snap.skills ?? {},
    coreStats: sanitizeCoreStats(snap.coreStats),
    unspentStatPoints: clampNumber(snap.unspentStatPoints, 0),
    totalLevel: clampNumber(snap.totalLevel, 1),
    level: clampNumber(snap.level, 1),

    hp: Math.min(hp, maxHp),
    maxHp,
    mana: Math.min(mana, maxMana),
    maxMana,
    stamina: Math.min(stamina, maxStamina),
    maxStamina,

    gold: clampNumber(snap.gold, 0),
  };
}

function getOverallProgress(snapshot: PlayerStatsSnapshot | null): number {
  if (!snapshot) return 0;

  const skillValues = Object.values(snapshot.skills);
  if (skillValues.length === 0) return 0;

  const sum = skillValues.reduce((acc, skill) => {
    return acc + clampNumber(skill.progressPercent, 0);
  }, 0);

  return Math.min(100, Math.max(0, sum / skillValues.length));
}

// ─── Components ──────────────────────────────────────────────────────────────

interface StatDisplayProps {
  stat: CoreStatKey;
  value: number;
  canAllocate: boolean;
  disabled: boolean;
  onAllocate: (stat: CoreStatKey) => void;
}

function StatDisplay({
  stat,
  value,
  canAllocate,
  disabled,
  onAllocate,
}: StatDisplayProps) {
  return (
    <div className="char-stat-row">
      <span className="char-stat-label">{STAT_LABELS[stat]}</span>
      <span className="char-stat-value">{value}</span>

      {canAllocate && (
        <button
          type="button"
          className="char-stat-btn"
          onClick={() => onAllocate(stat)}
          disabled={disabled}
          aria-label={`Allocate point to ${STAT_NAMES[stat]}`}
          title={`Allocate point to ${STAT_NAMES[stat]}`}
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
  const safeMax = Math.max(1, clampNumber(max, 1));
  const safeCurrent = Math.min(safeMax, clampNumber(current, 0));
  const percent = Math.min(100, Math.max(0, (safeCurrent / safeMax) * 100));
  const valueText = `${label}: ${Math.floor(safeCurrent)} / ${Math.floor(safeMax)}`;

  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>
          {Math.floor(safeCurrent)}/{Math.floor(safeMax)}
        </span>
      </div>

      <div
        className="char-bar-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.floor(safeMax)}
        aria-valuenow={Math.floor(safeCurrent)}
        aria-valuetext={valueText}
        title={valueText}
      >
        <div
          className="char-bar-fill"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  percent: number;
  color?: string;
}

function ProgressBar({ label, percent, color = "#9ac0ff" }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, clampNumber(percent, 0)));
  const valueText = `${label}: ${safePercent.toFixed(0)}%`;

  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>{safePercent.toFixed(0)}%</span>
      </div>

      <div
        className="char-bar-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(safePercent)}
        aria-valuetext={valueText}
        title={valueText}
      >
        <div
          className="char-bar-fill"
          style={{
            width: `${safePercent}%`,
            backgroundColor: color,
          }}
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

export function CharacterWindow({
  isOpen = true,
  onClose,
}: CharacterWindowProps) {
  const snapshot = useCharacterWindow();
  const [allocating, setAllocating] = useState(false);

  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;

      if (detail?.event !== "player_stats_snapshot") return;
      if (!detail.payload) return;

      characterWindowStore.receiveSnapshot(detail.payload as PlayerStatsSnapshot);
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);

    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  useEffect(() => {
    if (!allocating) return;

    const timeout = window.setTimeout(() => {
      setAllocating(false);
    }, 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [allocating]);

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleAllocate = useCallback(
    (stat: CoreStatKey) => {
      if (!snapshot) return;
      if (snapshot.unspentStatPoints <= 0) return;
      if (allocating) return;

      window.dispatchEvent(
        new CustomEvent("wasd:client-action", {
          detail: {
            action: "stat_allocation",
            payload: {
              intent: "stat_alloc",
              playerId: snapshot.playerId,
              stat,
            },
          },
        })
      );

      setAllocating(true);
    },
    [snapshot, allocating]
  );

  if (!isOpen) return null;

  const stats = snapshot?.coreStats ?? DEFAULT_CORE_STATS;
  const unspentPoints = snapshot?.unspentStatPoints ?? 0;
  const level = snapshot?.level ?? 1;
  const totalLevel = snapshot?.totalLevel ?? level;
  const averageSkillProgress = getOverallProgress(snapshot);

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Character">
      <div className="wow-inventory-header">
        <h2>CHARACTER</h2>

        {onClose && (
          <button
            type="button"
            className="wow-close-btn"
            onClick={onClose}
            aria-label="Close [ESC]"
            aria-keyshortcuts="Escape"
          >
            <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>
            ✕
          </button>
        )}

        {unspentPoints > 0 && (
          <div className="char-unspent-badge">{unspentPoints} Points</div>
        )}
      </div>

      <div className="char-content">
        <section className="char-section" aria-label="Equipment">
          <EquipmentPanel />
        </section>

        <section className="char-section" aria-label="Level">
          <div className="char-level-display">
            <span className="char-level-label">Level</span>
            <span className="char-level-value">{level}</span>
          </div>

          <div className="char-resource-row">
            <span className="char-resource-icon">⚔️</span>
            <span className="char-resource-value">
              Total Level {totalLevel}
            </span>
          </div>

          <ProgressBar
            label="Average Skill Progress"
            percent={averageSkillProgress}
            color="#9ac0ff"
          />
        </section>

        <section className="char-section" aria-label="Vitals">
          <h3>Vitals</h3>

          {snapshot ? (
            <>
              <StatBar
                label="HP"
                current={snapshot.hp}
                max={snapshot.maxHp}
                color="#e04040"
              />
              <StatBar
                label="Mana"
                current={snapshot.mana}
                max={snapshot.maxMana}
                color="#4080ff"
              />
              <StatBar
                label="Stamina"
                current={snapshot.stamina}
                max={snapshot.maxStamina}
                color="#40c040"
              />
            </>
          ) : (
            <div className="char-resource-row">
              <span className="char-resource-icon">⟳</span>
              <span className="char-resource-value">Waiting for stats...</span>
            </div>
          )}
        </section>

        <section className="char-section" aria-label="Attributes">
          <h3>Attributes</h3>

          <div className="char-stats-grid">
            {CORE_STAT_KEYS.map((stat) => (
              <StatDisplay
                key={stat}
                stat={stat}
                value={stats[stat]}
                canAllocate={unspentPoints > 0}
                disabled={allocating}
                onAllocate={handleAllocate}
              />
            ))}
          </div>
        </section>

        <section className="char-section" aria-label="Resources">
          <h3>Resources</h3>

          <div className="char-resource-row">
            <span className="char-resource-icon">💰</span>
            <span className="char-resource-value">
              {snapshot?.gold ?? 0} Gold
            </span>
          </div>
        </section>
      </div>

      {allocating && (
        <div className="wow-pending-indicator" aria-live="polite">
          <span>⟳</span> Allocating...
        </div>
      )}
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

let mountedRoot: Root | null = null;

export function mountCharacterWindow(containerId = "character-mount"): void {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Character mount point #${containerId} not found`);
    return;
  }

  if (!mountedRoot) {
    mountedRoot = createRoot(container);
  }

  mountedRoot.render(<CharacterWindow />);
}

export function unmountCharacterWindow(): void {
  if (!mountedRoot) return;

  mountedRoot.unmount();
  mountedRoot = null;
                                          }
