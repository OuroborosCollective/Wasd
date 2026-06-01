/**
 * Ouroboros CharacterWindow — WoW-Style Character Sheet
 *
 * Shows player level, skill progress, core stats, resources, and equipment panel.
 * Includes Paper-Doll equipment display with touch-safe drag & drop.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * Server-authoritative rule:
 * - Client displays snapshots only.
 * - Client sends stat allocation intent only.
 * - Client does NOT calculate real XP/level progression.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DnDProvider } from "../dnd/DnDContext";
import { EquipmentPanel } from "./EquipmentPanel";
import "../inventoryGrid.css";
import "./equipmentPanel.css";

export type CoreStatKey = "strength" | "agility" | "intelligence";

export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number;
}

export interface CoreStats {
  strength: number;
  agility: number;
  intelligence: number;
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

  /**
   * Optional server tick fields.
   * Prefer server-provided tick over client time.
   */
  tick?: number;
  serverTick?: number;
}

// ─── State Store ─────────────────────────────────────────────────────────────

class CharacterWindowStore {
  private snapshot: PlayerStatsSnapshot | null = null;
  private listeners = new Set<() => void>();

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
    this.snapshot = snap;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
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

const CORE_STATS: readonly CoreStatKey[] = [
  "strength",
  "agility",
  "intelligence",
] as const;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlayerStatsSnapshot(value: unknown): value is PlayerStatsSnapshot {
  if (!isRecord(value)) return false;
  if (typeof value.playerId !== "string") return false;
  if (!isRecord(value.coreStats)) return false;

  return (
    typeof value.coreStats.strength === "number" &&
    typeof value.coreStats.agility === "number" &&
    typeof value.coreStats.intelligence === "number" &&
    typeof value.unspentStatPoints === "number" &&
    typeof value.totalLevel === "number" &&
    typeof value.hp === "number" &&
    typeof value.maxHp === "number" &&
    typeof value.mana === "number" &&
    typeof value.maxMana === "number" &&
    typeof value.stamina === "number" &&
    typeof value.maxStamina === "number" &&
    typeof value.gold === "number" &&
    typeof value.level === "number"
  );
}

function clampPercent(current: number, max: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / max) * 100));
}

function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function getSnapshotTick(snapshot: PlayerStatsSnapshot): number {
  return safeNumber(snapshot.serverTick ?? snapshot.tick ?? 0, 0);
}

function getAverageSkillProgress(snapshot: PlayerStatsSnapshot): number {
  const skills = Object.values(snapshot.skills ?? {});

  if (skills.length === 0) {
    return 0;
  }

  const total = skills.reduce((sum, skill) => {
    return sum + safeNumber(skill.progressPercent, 0);
  }, 0);

  return Math.round(total / skills.length);
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
  const safeCurrent = Math.max(0, Math.floor(safeNumber(current, 0)));
  const safeMax = Math.max(0, Math.floor(safeNumber(max, 0)));
  const percent = clampPercent(safeCurrent, safeMax);

  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>
          {safeCurrent}/{safeMax}
        </span>
      </div>

      <div className="char-bar-track">
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

interface PercentBarProps {
  label: string;
  percent: number;
  color?: string;
}

function PercentBar({ label, percent, color = "#9ac0ff" }: PercentBarProps) {
  const safePercent = Math.max(0, Math.min(100, Math.round(safeNumber(percent, 0))));

  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>{safePercent}%</span>
      </div>

      <div className="char-bar-track">
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
  const [allocatingStat, setAllocatingStat] = useState<CoreStatKey | null>(null);

  useEffect(() => {
    const handleNetworkPacket = (event: Event): void => {
      const detail = (event as CustomEvent<unknown>).detail;

      if (!isRecord(detail)) return;
      if (detail.event !== "player_stats_snapshot") return;

      const payload = detail.payload;

      if (!isPlayerStatsSnapshot(payload)) {
        console.warn("Invalid player_stats_snapshot payload ignored", payload);
        return;
      }

      characterWindowStore.receiveSnapshot(payload);
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  /**
   * Clear optimistic pending state once the server sends a fresh snapshot.
   * No gameplay authority is granted to the client.
   */
  useEffect(() => {
    if (snapshot) {
      setAllocatingStat(null);
    }
  }, [snapshot]);

  const handleAllocate = useCallback(
    (stat: CoreStatKey): void => {
      if (!snapshot) return;
      if (snapshot.unspentStatPoints <= 0) return;
      if (allocatingStat !== null) return;

      const intent = {
        intent: "stat_alloc" as const,
        playerId: snapshot.playerId,
        stat,
        tick: getSnapshotTick(snapshot),
      };

      window.dispatchEvent(
        new CustomEvent("wasd:client-action", {
          detail: {
            action: "stat_allocation",
            payload: intent,
          },
        })
      );

      setAllocatingStat(stat);
    },
    [snapshot, allocatingStat]
  );

  const derived = useMemo(() => {
    const fallbackStats: CoreStats = {
      strength: 10,
      agility: 10,
      intelligence: 10,
    };

    const stats = snapshot?.coreStats ?? fallbackStats;
    const unspentPoints = Math.max(0, snapshot?.unspentStatPoints ?? 0);
    const level = Math.max(1, snapshot?.level ?? 1);
    const totalLevel = Math.max(1, snapshot?.totalLevel ?? level);
    const averageSkillProgress = snapshot ? getAverageSkillProgress(snapshot) : 0;

    return {
      stats,
      unspentPoints,
      level,
      totalLevel,
      averageSkillProgress,
      canAllocate: Boolean(snapshot && unspentPoints > 0),
    };
  }, [snapshot]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Character">
      <div className="wow-inventory-header">
        <h2>CHARACTER</h2>

        {onClose && (
          <button
            type="button"
            className="wow-close-btn"
            onClick={onClose}
            aria-label="Close character window"
          >
            ✕
          </button>
        )}

        {derived.unspentPoints > 0 && (
          <div className="char-unspent-badge">
            {derived.unspentPoints} Point{derived.unspentPoints === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className="char-content">
        <section className="char-section" aria-label="Equipment">
          <DnDProvider>
            <EquipmentPanel />
          </DnDProvider>
        </section>

        <section className="char-section" aria-label="Level">
          <div className="char-level-display">
            <span className="char-level-label">Level</span>
            <span className="char-level-value">{derived.level}</span>
          </div>

          <div className="char-resource-row">
            <span className="char-resource-icon">✦</span>
            <span className="char-resource-value">
              Total Skill Level {derived.totalLevel}
            </span>
          </div>

          {snapshot && (
            <PercentBar
              label="Average Skill Progress"
              percent={derived.averageSkillProgress}
              color="#9ac0ff"
            />
          )}
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
              <span className="char-resource-value">Waiting for server snapshot</span>
            </div>
          )}
        </section>

        <section className="char-section" aria-label="Attributes">
          <h3>Attributes</h3>

          <div className="char-stats-grid">
            {CORE_STATS.map((stat) => (
              <StatDisplay
                key={stat}
                stat={stat}
                value={derived.stats[stat]}
                canAllocate={derived.canAllocate}
                disabled={allocatingStat !== null}
                onAllocate={handleAllocate}
              />
            ))}
          </div>
        </section>

        <section className="char-section" aria-label="Resources">
          <h3>Resources</h3>

          <div className="char-resource-row">
            <span className="char-resource-icon">💰</span>
            <span className="char-resource-value">{snapshot?.gold ?? 0} Gold</span>
          </div>
        </section>
      </div>

      {allocatingStat && (
        <div className="wow-pending-indicator" role="status" aria-live="polite">
          <span>⟳</span> Allocating {STAT_LABELS[allocatingStat]}...
        </div>
      )}
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

const mountedRoots = new Map<Element, Root>();

export function mountCharacterWindow(containerId = "character-mount"): void {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Character mount point #${containerId} not found`);
    return;
  }

  const existingRoot = mountedRoots.get(container);

  if (existingRoot) {
    existingRoot.render(<CharacterWindow />);
    return;
  }

  const root = createRoot(container);
  mountedRoots.set(container, root);
  root.render(<CharacterWindow />);
              }
