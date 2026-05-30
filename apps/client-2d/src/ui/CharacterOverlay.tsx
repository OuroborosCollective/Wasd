/**
 * Ouroboros CharacterOverlay — RuneScape-Style Character Sheet
 * 
 * ARCHITECTURE (Read-Only Stats Axiom):
 * - This UI NEVER calculates XP or levels locally
 * - All stats are received from server via player_stats_snapshot
 * - Uses useSyncExternalStore for reactive server-driven updates
 * 
 * Keyboard: Press 'C' to toggle character sheet
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSyncExternalStore } from "react";
import "./characterOverlay.css";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillSnapshot {
  xp: number;
  level: number;
  nextLevelXP: number;
  progressPercent: number;
}

export interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, SkillSnapshot>;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILL_DISPLAY_ORDER = [
  "sword_mastery",
  "blunt_force", 
  "archery",
  "heavy_armor",
  "evasion",
  "shield_wall",
  "combat",
] as const;

const SKILL_LABELS: Record<string, string> = {
  sword_mastery: "Sword Mastery",
  blunt_force: "Blunt Force",
  archery: "Archery",
  heavy_armor: "Heavy Armor",
  evasion: "Evasion",
  shield_wall: "Shield Wall",
  combat: "Combat",
};

// ─── State Store ──────────────────────────────────────────────────────────────

class CharacterStateStore {
  private state: PlayerStatsSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  public getSnapshot(): PlayerStatsSnapshot | null {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  /** Called by network handler when server broadcasts player_stats_snapshot */
  public receiveSnapshot(snapshot: PlayerStatsSnapshot): void {
    this.state = snapshot;
    this.notify();
  }

  /** Clear state on disconnect */
  public clear(): void {
    this.state = null;
    this.notify();
  }
}

export const characterStateStore = new CharacterStateStore();

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCharacterStats(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    characterStateStore.subscribe,
    () => characterStateStore.getSnapshot(),
    () => null
  );
}

// ─── Components ────────────────────────────────────────────────────────────────

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color: string;
  showText?: boolean;
}

function StatBar({ label, current, max, color, showText = true }: StatBarProps) {
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  
  return (
    <div className="char-stat-bar">
      <div className="char-stat-label">{label}</div>
      <div className="char-stat-bar-container">
        <div 
          className="char-stat-bar-fill" 
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      {showText && (
        <div className="char-stat-value">{current} / {max}</div>
      )}
    </div>
  );
}

interface SkillRowProps {
  skillId: string;
  skill: SkillSnapshot;
}

function SkillRow({ skillId, skill }: SkillRowProps) {
  const label = SKILL_LABELS[skillId] ?? skillId.replace(/_/g, " ");
  const formattedXP = skill.xp.toLocaleString();
  const nextXP = skill.nextLevelXP.toLocaleString();
  
  return (
    <div className="char-skill-row">
      <div className="char-skill-info">
        <span className="char-skill-name">{label}</span>
        <span className="char-skill-level">Lv. {skill.level}</span>
      </div>
      <div className="char-skill-xp">
        <div className="char-skill-progress-container">
          <div 
            className="char-skill-progress-fill" 
            style={{ width: `${skill.progressPercent}%` }}
          />
        </div>
        <span className="char-skill-xp-text">
          {formattedXP} / {nextXP}
        </span>
      </div>
    </div>
  );
}

// ─── Main Character Overlay ────────────────────────────────────────────────────

interface CharacterOverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function CharacterOverlay({ isOpen = true, onClose }: CharacterOverlayProps) {
  const snapshot = useCharacterStats();

  // Listen for WebSocket stats updates
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "player_stats_snapshot") {
        characterStateStore.receiveSnapshot(detail.payload);
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);

    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  // Calculate derived stats
  const hpPercent = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.maxHp > 0 ? (snapshot.hp / snapshot.maxHp) * 100 : 0;
  }, [snapshot?.hp, snapshot?.maxHp]);

  const manaPercent = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.maxMana > 0 ? (snapshot.mana / snapshot.maxMana) * 100 : 0;
  }, [snapshot?.mana, snapshot?.maxMana]);

  const staminaPercent = useMemo(() => {
    if (!snapshot) return 0;
    return snapshot.maxStamina > 0 ? (snapshot.stamina / snapshot.maxStamina) * 100 : 0;
  }, [snapshot?.stamina, snapshot?.maxStamina]);

  // Sort skills by display order, then alphabetically
  const sortedSkills = useMemo(() => {
    if (!snapshot?.skills) return [];
    
    const skills = Object.entries(snapshot.skills);
    return skills.sort(([aId], [bId]) => {
      const aIdx = SKILL_DISPLAY_ORDER.indexOf(aId as typeof SKILL_DISPLAY_ORDER[number]);
      const bIdx = SKILL_DISPLAY_ORDER.indexOf(bId as typeof SKILL_DISPLAY_ORDER[number]);
      
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      return aId.localeCompare(bId);
    });
  }, [snapshot?.skills]);

  if (!isOpen) return null;

  return (
    <div className="character-overlay" role="dialog" aria-label="Character Sheet">
      {/* Header */}
      <div className="char-header">
        <h2>Character</h2>
        {onClose && (
          <button className="char-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      {/* Player Info */}
      <div className="char-player-info">
        <div className="char-player-name">
          {snapshot?.playerId ?? "Unknown"}
        </div>
        <div className="char-player-level">
          <span className="char-level-badge">Lv. {snapshot?.level ?? 1}</span>
          <span className="char-total-level">Total: {snapshot?.totalLevel ?? 0}</span>
        </div>
        <div className="char-gold">
          <span className="char-gold-icon">◆</span>
          <span className="char-gold-value">{snapshot?.gold?.toLocaleString() ?? 0} Gold</span>
        </div>
      </div>

      {/* Vital Stats */}
      <section className="char-section" aria-label="Vitals">
        <h3>Vitals</h3>
        <StatBar 
          label="HP" 
          current={snapshot?.hp ?? 0} 
          max={snapshot?.maxHp ?? 100} 
          color="#e03030"
        />
        <StatBar 
          label="Mana" 
          current={snapshot?.mana ?? 0} 
          max={snapshot?.maxMana ?? 25} 
          color="#3080e0"
        />
        <StatBar 
          label="Stamina" 
          current={snapshot?.stamina ?? 0} 
          max={snapshot?.maxStamina ?? 100} 
          color="#30c030"
        />
      </section>

      {/* Skills */}
      <section className="char-section char-skills-section" aria-label="Skills">
        <h3>Skills</h3>
        <div className="char-skills-list">
          {sortedSkills.map(([skillId, skill]) => (
            <SkillRow 
              key={skillId} 
              skillId={skillId} 
              skill={skill} 
            />
          ))}
        </div>
      </section>

      {/* Empty State */}
      {!snapshot && (
        <div className="char-empty-state">
          <p>No character data received.</p>
          <p className="char-empty-hint">Start combat to earn XP!</p>
        </div>
      )}
    </div>
  );
}

// ─── Mount Helper ─────────────────────────────────────────────────────────────

export function mountCharacterOverlay(containerId = "character-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Character mount point #${containerId} not found`);
    return;
  }
  
  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<CharacterOverlay />);
  });
}
