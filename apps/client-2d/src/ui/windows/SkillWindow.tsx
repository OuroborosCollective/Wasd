/**
 * Ouroboros SkillWindow — WoW-Style Skills Panel
 * 
 * Displays crafting skills with unlimited level scaling.
 * Shows skill level and the resulting bonus chance (e.g., "+14% Success/Multi-Yield").
 * Follows the Panzerschrank brutalist design aesthetic.
 */

import { useState, useEffect } from "react";
import { useSyncExternalStore } from "react";
import "../inventoryGrid.css";

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
  coreStats: { strength: number; agility: number; intelligence: number };
  unspentStatPoints: number;
  totalLevel: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SKILL_BONUS_PER_10_LEVELS = 1;

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  carpentry: "Carpentry",
  smithing: "Smithing",
  alchemy: "Alchemy",
  enchanting: "Enchanting",
  tailoring: "Tailoring",
  masonry: "Masonry",
  cooking: "Cooking",
  herbalism: "Herbalism",
  // Combat skills
  sword_mastery: "Sword Mastery",
  blunt_force: "Blunt Force",
  archery: "Archery",
  heavy_armor: "Heavy Armor",
  evasion: "Evasion",
  shield_wall: "Shield Wall",
  combat: "Combat",
};

const SKILL_ICONS: Record<string, string> = {
  carpentry: "🪵",
  smithing: "⚒️",
  alchemy: "⚗️",
  enchanting: "✨",
  tailoring: "🧵",
  masonry: "🧱",
  cooking: "🍳",
  herbalism: "🌿",
  sword_mastery: "⚔️",
  blunt_force: "🔨",
  archery: "🏹",
  heavy_armor: "🛡️",
  evasion: "💨",
  shield_wall: "🔰",
  combat: "⚔️",
};

// ─── State Store ─────────────────────────────────────────────────────────────

class SkillWindowStore {
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

export const skillWindowStore = new SkillWindowStore();

export function useSkillWindow(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    (l) => skillWindowStore.subscribe(l),
    () => skillWindowStore.getSnapshot(),
    () => null
  );
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function calculateSkillBonus(level: number): number {
  return Math.floor(level / SKILL_BONUS_PER_10_LEVELS);
}

function getBonusDescription(level: number): string {
  const bonus = calculateSkillBonus(level);
  if (bonus === 0) return "Base chance";
  if (level >= 100) return `+${bonus}% (Multi-Yield!)`;
  return `+${bonus}% success`;
}

// ─── Components ───────────────────────────────────────────────────────────────

interface SkillRowProps {
  skillId: string;
  level: number;
  progressPercent: number;
  xp: number;
}

function SkillRow({ skillId, level, progressPercent, xp }: SkillRowProps) {
  const displayName = SKILL_DISPLAY_NAMES[skillId] || skillId;
  const icon = SKILL_ICONS[skillId] || "📦";
  const bonus = calculateSkillBonus(level);
  const bonusDesc = getBonusDescription(level);

  return (
    <div className="skill-row">
      <div className="skill-icon">{icon}</div>
      <div className="skill-info">
        <div className="skill-name">{displayName}</div>
        <div className="skill-bonus" style={{ color: bonus > 0 ? "#1eff00" : "#6a7a8a" }}>
          {bonusDesc}
        </div>
      </div>
      <div className="skill-level-container">
        <span className="skill-level">{level}</span>
        {bonus >= 10 && <span className="skill-overcap-badge">OVERCAP!</span>}
      </div>
      <div className="skill-progress-track">
        <div
          className="skill-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="skill-xp">{xp.toLocaleString()} XP</div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface SkillWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SkillWindow({ isOpen = true, onClose }: SkillWindowProps) {
  const snapshot = useSkillWindow();

  // Listen for stats updates
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "player_stats_snapshot") {
        skillWindowStore.receiveSnapshot(detail.payload);
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  if (!isOpen) return null;

  const skills = snapshot?.skills ?? {};
  const totalLevel = snapshot?.totalLevel ?? 0;

  // Sort skills by level (highest first)
  const sortedSkillIds = Object.keys(skills).sort((a, b) => {
    return (skills[b].level || 0) - (skills[a].level || 0);
  });

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Skills">
      <div className="wow-inventory-header">
        <h2>SKILLS</h2>
        {onClose && (
          <button className="wow-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
        <div className="skill-total-level">
          Total: {totalLevel}
        </div>
      </div>

      <div className="skill-content">
        {/* Crafting Skills */}
        <section className="skill-section">
          <h3>Crafting</h3>
          <div className="skill-list">
            {sortedSkillIds
              .filter(id => ["carpentry", "smithing", "alchemy", "enchanting", "tailoring", "masonry", "cooking", "herbalism"].includes(id))
              .map(skillId => (
                <SkillRow
                  key={skillId}
                  skillId={skillId}
                  level={skills[skillId]?.level ?? 1}
                  progressPercent={skills[skillId]?.progressPercent ?? 0}
                  xp={skills[skillId]?.xp ?? 0}
                />
              ))}
          </div>
        </section>

        {/* Combat Skills */}
        <section className="skill-section">
          <h3>Combat</h3>
          <div className="skill-list">
            {sortedSkillIds
              .filter(id => ["sword_mastery", "blunt_force", "archery", "heavy_armor", "evasion", "shield_wall", "combat"].includes(id))
              .map(skillId => (
                <SkillRow
                  key={skillId}
                  skillId={skillId}
                  level={skills[skillId]?.level ?? 1}
                  progressPercent={skills[skillId]?.progressPercent ?? 0}
                  xp={skills[skillId]?.xp ?? 0}
                />
              ))}
          </div>
        </section>

        {/* Overcap Info */}
        <section className="skill-section skill-info-section">
          <h3>Overcap Multi-Yield System</h3>
          <div className="skill-overcap-explanation">
            <p>When crafting skill exceeds 100% bonus chance:</p>
            <ul>
              <li>Every 10 levels = +1% success chance</li>
              <li>Over 100% = Multi-Yield (craft multiple items!)</li>
              <li>Formula: yield = floor(totalChance / 100)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

export function mountSkillWindow(containerId = "skill-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Skill mount point #${containerId} not found`);
    return;
  }

  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<SkillWindow />);
  });
}