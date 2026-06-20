/**
 * Ouroboros SkillWindow — Skills and Progression
 *
 * Shows player skill levels and progression.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * SERVER-AUTHORITATIVE RULE:
 * - Client displays snapshots only.
 * - Client sends allocation intent only.
 * - Server validates unspent points and applies stats.
 * - Client does NOT calculate XP, levels, or authoritative stat state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useSyncExternalStore } from "react";
import { DnDProvider } from "../dnd/DnDContext";
import { EquipmentPanel } from "./EquipmentPanel";
import "../inventoryGrid.css";
import "./equipmentPanel.css";

export type CoreStatKey = "strength" | "agility" | "intelligence";

export interface CoreStats {
  readonly strength: number;
  readonly agility: number;
  readonly intelligence: number;
}

export interface SkillSnapshot {
  readonly xp: number;
  readonly level: number;
  readonly nextLevelXP: number;
  readonly progressPercent: number;
}

export interface PlayerStatsSnapshot {
  readonly playerId: string;
  readonly skills: Record<string, SkillSnapshot>;
  readonly coreStats: CoreStats;
  readonly unspentStatPoints: number;
  readonly totalLevel: number;

  readonly hp: number;
  readonly maxHp: number;
  readonly mana: number;
  readonly maxMana: number;
  readonly stamina: number;
  readonly maxStamina: number;
  readonly gold: number;
  readonly level: number;

  /**
   * Optional server tick.
   * If your PlayerStatsDirector already includes tick, this keeps allocation intents aligned
   * without using Date.now().
   */
  readonly tick?: number;
}

export interface StatAllocationIntent {
  readonly intent: "stat_alloc";
  readonly playerId: string;
  readonly stat: CoreStatKey;

  /**
   * Client only echoes the last known server tick if available.
   * Server remains the authority.
   */
  readonly clientKnownTick: number;
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
    this.snapshot = normalizeStatsSnapshot(snap);
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

const DEFAULT_CORE_STATS: CoreStats = {
  strength: 10,
  agility: 10,
  intelligence: 10,
};

const STAT_ORDER: readonly CoreStatKey[] = ["strength", "agility", "intelligence"];

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

function safeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeInteger(value: unknown, fallback: number): number {
  const n = safeNumber(value, fallback);
  return Math.max(0, Math.floor(n));
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function normalizeStatsSnapshot(snap: PlayerStatsSnapshot): PlayerStatsSnapshot {
  return {
    ...snap,
    playerId: typeof snap.playerId === "string" ? snap.playerId : "",
    skills: snap.skills && typeof snap.skills === "object" ? snap.skills : {},
    coreStats: {
      strength: safeInteger(snap.coreStats?.strength, DEFAULT_CORE_STATS.strength),
      agility: safeInteger(snap.coreStats?.agility, DEFAULT_CORE_STATS.agility),
      intelligence: safeInteger(snap.coreStats?.intelligence, DEFAULT_CORE_STATS.intelligence),
    },
    unspentStatPoints: safeInteger(snap.unspentStatPoints, 0),
    totalLevel: safeInteger(snap.totalLevel, 1),

    hp: safeInteger(snap.hp, 1),
    maxHp: Math.max(1, safeInteger(snap.maxHp, 1)),
    mana: safeInteger(snap.mana, 0),
    maxMana: Math.max(1, safeInteger(snap.maxMana, 1)),
    stamina: safeInteger(snap.stamina, 0),
    maxStamina: Math.max(1, safeInteger(snap.maxStamina, 1)),
    gold: safeInteger(snap.gold, 0),
    level: Math.max(1, safeInteger(snap.level, 1)),
    tick: typeof snap.tick === "number" && Number.isFinite(snap.tick) ? Math.floor(snap.tick) : undefined,
  };
}

// ─── Components ──────────────────────────────────────────────────────────────

interface StatDisplayProps {
  readonly stat: CoreStatKey;
  readonly value: number;
  readonly canAllocate: boolean;
  readonly isPending: boolean;
  readonly onAllocate: (stat: CoreStatKey) => void;
}

function StatDisplay({ stat, value, canAllocate, isPending, onAllocate }: StatDisplayProps) {
  return (
    <div className="char-stat-row">
      <span className="char-stat-label">{STAT_LABELS[stat]}</span>
      <span className="char-stat-value">{value}</span>

      <button
        className="char-stat-btn"
        onClick={() => onAllocate(stat)}
        disabled={!canAllocate || isPending}
        aria-label={`Allocate point to ${STAT_NAMES[stat]}`}
        title={canAllocate ? `Allocate point to ${STAT_NAMES[stat]}` : "No unspent stat points"}
      >
        +
      </button>
    </div>
  );
}

interface StatBarProps {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly color?: string;
}

function StatBar({ label, current, max, color = "#c8b878" }: StatBarProps) {
  const safeMax = Math.max(1, safeNumber(max, 1));
  const safeCurrent = Math.max(0, safeNumber(current, 0));
  const percent = clampPercent((safeCurrent / safeMax) * 100);

  return (
    <div className="char-bar-container">
      <div className="char-bar-label">
        <span>{label}</span>
        <span>
          {Math.floor(safeCurrent)}/{Math.floor(safeMax)}
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

interface XPBarProps {
  readonly snapshot: PlayerStatsSnapshot;
}

function XPBar({ snapshot }: XPBarProps) {
  /**
   * Best effort:
   * If your server later sends a dedicated total XP snapshot, use that instead.
   * For now this avoids pretending totalLevel is current XP.
   */
  const combatSkill = snapshot.skills.combat;
  const firstSkill = Object.values(snapshot.skills)[0];
  const xpSource = combatSkill ?? firstSkill;

  if (!xpSource) {
    return <StatBar label="XP" current={0} max={100} color="#9ac0ff" />;
  }

  const nextLevelXP = Math.max(1, safeInteger(xpSource.nextLevelXP, 100));
  const xp = safeInteger(xpSource.xp, 0);

  return <StatBar label="XP" current={xp} max={nextLevelXP} color="#9ac0ff" />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CharacterWindowProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function SkillWindow({ isOpen = true, onClose }: CharacterWindowProps) {
  const snapshot = useCharacterWindow();
  const [allocatingStat, setAllocatingStat] = useState<CoreStatKey | null>(null);
  const clearPendingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;

      if (detail?.event !== "player_stats_snapshot") return;
      if (!detail.payload || typeof detail.payload !== "object") return;

      characterWindowStore.receiveSnapshot(detail.payload as PlayerStatsSnapshot);
      setAllocatingStat(null);
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (clearPendingTimerRef.current !== null) {
        window.clearTimeout(clearPendingTimerRef.current);
        clearPendingTimerRef.current = null;
      }
    };
  }, []);

  const handleAllocate = useCallback(
    (stat: CoreStatKey) => {
      if (!snapshot) return;
      if (snapshot.unspentStatPoints <= 0) return;
      if (allocatingStat !== null) return;

      const intent: StatAllocationIntent = {
        intent: "stat_alloc",
        playerId: snapshot.playerId,
        stat,
        clientKnownTick: snapshot.tick ?? 0,
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

      if (clearPendingTimerRef.current !== null) {
        window.clearTimeout(clearPendingTimerRef.current);
      }

      /**
       * UI-only failsafe.
       * The real confirmation still comes from the next server snapshot.
       */
      clearPendingTimerRef.current = window.setTimeout(() => {
        setAllocatingStat(null);
        clearPendingTimerRef.current = null;
      }, 1200);
    },
    [snapshot, allocatingStat]
  );

  if (!isOpen) return null;

  const stats = snapshot?.coreStats ?? DEFAULT_CORE_STATS;
  const unspentPoints = snapshot?.unspentStatPoints ?? 0;
  const level = snapshot?.level ?? 1;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Skills">
      <div className="wow-inventory-header">
        <h2>SKILLS</h2>

        {onClose && (
          <button
            className="wow-close-btn"
            onClick={onClose}
            aria-label="Close skills [ESC]"
            aria-keyshortcuts="Escape"
          >
            <kbd className="cz-kbd">ESC</kbd>
            ✕
          </button>
        )}

        {unspentPoints > 0 && (
          <div className="char-unspent-badge">
            {unspentPoints} {unspentPoints === 1 ? "Point" : "Points"}
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
            <span className="char-level-value">{level}</span>
          </div>

          {snapshot ? (
            <XPBar snapshot={snapshot} />
          ) : (
            <StatBar label="XP" current={0} max={100} color="#9ac0ff" />
          )}
        </section>

        <section className="char-section" aria-label="Vitals">
          <h3>Vitals</h3>

          {snapshot ? (
            <>
              <StatBar label="HP" current={snapshot.hp} max={snapshot.maxHp} color="#e04040" />
              <StatBar label="Mana" current={snapshot.mana} max={snapshot.maxMana} color="#4080ff" />
              <StatBar
                label="Stamina"
                current={snapshot.stamina}
                max={snapshot.maxStamina}
                color="#40c040"
              />
            </>
          ) : (
            <>
              <StatBar label="HP" current={0} max={1} color="#e04040" />
              <StatBar label="Mana" current={0} max={1} color="#4080ff" />
              <StatBar label="Stamina" current={0} max={1} color="#40c040" />
            </>
          )}
        </section>

        <section className="char-section" aria-label="Attributes">
          <h3>Attributes</h3>

          <div className="char-stats-grid">
            {STAT_ORDER.map((stat) => (
              <StatDisplay
                key={stat}
                stat={stat}
                value={stats[stat]}
                canAllocate={unspentPoints > 0}
                isPending={allocatingStat !== null}
                onAllocate={handleAllocate}
              />
            ))}
          </div>
        </section>

        <section className="char-section" aria-label="Resources">
          <h3>Resources</h3>

          <div className="char-resource-row">
            <span className="char-resource-icon" aria-hidden="true">
              💰
            </span>
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

let mountedSkillRoot: Root | null = null;

export function mountSkillWindow(containerId = "skill-mount"): void {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Skill mount point #${containerId} not found`);
    return;
  }

  if (!mountedSkillRoot) {
    mountedSkillRoot = createRoot(container);
  }

  mountedSkillRoot.render(<SkillWindow />);
}

// ─── Re-export Alias ────────────────────────────────────────────────────────
// SkillWindow is used in UIManager.tsx for the SKILLS overlay.
// This file contains SkillWindow component already exported above.
