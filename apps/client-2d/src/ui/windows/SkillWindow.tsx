/**
 * Ouroboros SkillWindow — WoW-Style Skills Panel
 *
 * Displays crafting and combat skills with unlimited level scaling.
 * Shows skill level and the resulting bonus chance.
 * Follows the Panzerschrank brutalist design aesthetic.
 */

import { useEffect, useSyncExternalStore } from "react";
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
  coreStats: {
    strength: number;
    agility: number;
    intelligence: number;
  };
  unspentStatPoints: number;
  totalLevel: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVELS_PER_BONUS_PERCENT = 10;

const CRAFTING_SKILLS = [
  "carpentry",
  "smithing",
  "alchemy",
  "enchanting",
  "tailoring",
  "masonry",
  "cooking",
  "herbalism",
] as const;

const COMBAT_SKILLS = [
  "sword_mastery",
  "blunt_force",
  "archery",
  "heavy_armor",
  "evasion",
  "shield_wall",
  "combat",
] as const;

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  carpentry: "Carpentry",
  smithing: "Smithing",
  alchemy: "Alchemy",
  enchanting: "Enchanting",
  tailoring: "Tailoring",
  masonry: "Masonry",
  cooking: "Cooking",
  herbalism: "Herbalism",

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

// ─── State Store ──────────────────────────────────────────────────────────────

class SkillWindowStore {
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

  receiveSnapshot(snapshot: PlayerStatsSnapshot): void {
    this.snapshot = snapshot;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const skillWindowStore = new SkillWindowStore();

export function useSkillWindow(): PlayerStatsSnapshot | null {
  return useSyncExternalStore(
    (listener) => skillWindowStore.subscribe(listener),
    () => skillWindowStore.getSnapshot(),
    () => null
  );
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatSkillName(skillId: string): string {
  return skillId
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function calculateSkillBonus(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.floor(level / LEVELS_PER_BONUS_PERCENT));
}

function getBonusDescription(level: number): string {
  const bonus = calculateSkillBonus(level);

  if (bonus <= 0) return "Base chance";
  if (bonus >= 100) return `+${bonus}% Multi-Yield`;
  return `+${bonus}% success`;
}

function sortSkillIdsByLevel(
  skillIds: readonly string[],
  skills: Record<string, SkillSnapshot>
): string[] {
  return [...skillIds].sort((a, b) => {
    const levelA = skills[a]?.level ?? 0;
    const levelB = skills[b]?.level ?? 0;

    if (levelA !== levelB) return levelB - levelA;
    return a.localeCompare(b);
  });
}

// ─── Components ───────────────────────────────────────────────────────────────

interface SkillRowProps {
  skillId: string;
  level: number;
  progressPercent: number;
  xp: number;
  nextLevelXP?: number;
}

function SkillRow({
  skillId,
  level,
  progressPercent,
  xp,
  nextLevelXP,
}: SkillRowProps) {
  const displayName = SKILL_DISPLAY_NAMES[skillId] ?? formatSkillName(skillId);
  const icon = SKILL_ICONS[skillId] ?? "📦";
  const safeLevel = Math.max(1, Math.floor(level || 1));
  const safeProgressPercent = clampPercent(progressPercent);
  const bonus = calculateSkillBonus(safeLevel);
  const bonusDesc = getBonusDescription(safeLevel);

  const xpTitle =
    typeof nextLevelXP === "number" && nextLevelXP > 0
      ? `${xp.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP`
      : `${xp.toLocaleString()} XP`;

  return (
    <div className="skill-row">
      <div className="skill-icon" aria-hidden="true">
        {icon}
      </div>

      <div className="skill-info">
        <div className="skill-name">{displayName}</div>
        <div
          className="skill-bonus"
          style={{ color: bonus > 0 ? "#1eff00" : "#6a7a8a" }}
        >
          {bonusDesc}
        </div>
      </div>

      <div className="skill-level-container">
        <span className="skill-level">{safeLevel}</span>
        {bonus >= 100 && <span className="skill-overcap-badge">MULTI</span>}
        {bonus >= 10 && bonus < 100 && (
          <span className="skill-overcap-badge">OVERCAP</span>
        )}
      </div>

      <div
        className="skill-progress-track"
        role="progressbar"
        aria-label={`${displayName} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeProgressPercent}
        title={`${safeProgressPercent.toFixed(1)}%`}
      >
        <div
          className="skill-progress-fill"
          style={{ width: `${safeProgressPercent}%` }}
        />
      </div>

      <div className="skill-xp" title={xpTitle}>
        {xp.toLocaleString()} XP
      </div>
    </div>
  );
}

interface SkillSectionProps {
  title: string;
  skillIds: readonly string[];
  skills: Record<string, SkillSnapshot>;
}

function SkillSection({ title, skillIds, skills }: SkillSectionProps) {
  const sortedSkillIds = sortSkillIdsByLevel(skillIds, skills);

  return (
    <section className="skill-section">
      <h3>{title}</h3>

      <div className="skill-list">
        {sortedSkillIds.map((skillId) => {
          const skill = skills[skillId];

          return (
            <SkillRow
              key={skillId}
              skillId={skillId}
              level={skill?.level ?? 1}
              progressPercent={skill?.progressPercent ?? 0}
              xp={skill?.xp ?? 0}
              nextLevelXP={skill?.nextLevelXP}
            />
          );
        })}
      </div>
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SkillWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function SkillWindow({ isOpen = true, onClose }: SkillWindowProps) {
  const snapshot = useSkillWindow();

  useEffect(() => {
    const handleNetworkPacket = (event: Event): void => {
      const detail = (event as CustomEvent).detail;

      if (detail?.event !== "player_stats_snapshot") return;
      if (!detail.payload || typeof detail.payload !== "object") return;

      skillWindowStore.receiveSnapshot(detail.payload as PlayerStatsSnapshot);
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);

    return () => {
      window.removeEventListener("wasd:network-packet", handleNetworkPacket);
    };
  }, []);

  if (!isOpen) return null;

  const skills = snapshot?.skills ?? {};
  const totalLevel = snapshot?.totalLevel ?? 0;

  const knownSkillIds = new Set<string>([
    ...CRAFTING_SKILLS,
    ...COMBAT_SKILLS,
  ]);

  const unknownSkillIds = Object.keys(skills)
    .filter((skillId) => !knownSkillIds.has(skillId))
    .sort((a, b) => {
      const levelA = skills[a]?.level ?? 0;
      const levelB = skills[b]?.level ?? 0;

      if (levelA !== levelB) return levelB - levelA;
      return a.localeCompare(b);
    });

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Skills">
      <div className="wow-inventory-header">
        <h2>SKILLS</h2>

        <div className="skill-total-level">Total: {totalLevel}</div>

        {onClose && (
          <button
            className="wow-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close skills window"
          >
            ✕
          </button>
        )}
      </div>

      <div className="skill-content">
        <SkillSection
          title="Crafting"
          skillIds={CRAFTING_SKILLS}
          skills={skills}
        />

        <SkillSection title="Combat" skillIds={COMBAT_SKILLS} skills={skills} />

        {unknownSkillIds.length > 0 && (
          <section className="skill-section">
            <h3>Other</h3>

            <div className="skill-list">
              {unknownSkillIds.map((skillId) => {
                const skill = skills[skillId];

                return (
                  <SkillRow
                    key={skillId}
                    skillId={skillId}
                    level={skill?.level ?? 1}
                    progressPercent={skill?.progressPercent ?? 0}
                    xp={skill?.xp ?? 0}
                    nextLevelXP={skill?.nextLevelXP}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="skill-section skill-info-section">
          <h3>Overcap Multi-Yield System</h3>

          <div className="skill-overcap-explanation">
            <p>Crafting skills scale without a hard cap.</p>

            <ul>
              <li>Every 10 levels = +1% success chance</li>
              <li>100% bonus and above unlocks stronger multi-yield behavior</li>
              <li>Formula: yield = floor(totalChance / 100)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

export async function mountSkillWindow(containerId = "skill-mount"): Promise<void> {
  const container = document.getElementById(containerId);

  if (!container) {
    console.warn(`Skill mount point #${containerId} not found`);
    return;
  }

  const { createRoot } = await import("react-dom/client");
  const root = createRoot(container);

  root.render(<SkillWindow />);
    }
