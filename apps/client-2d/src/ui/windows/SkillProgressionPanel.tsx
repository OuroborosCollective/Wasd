/**
 * Skill Progression Panel
 *
 * Displays player skill progression from LiveGameplaySnapshot.
 * Server-authoritative display only - client cannot set XP/levels.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 */

import React from "react";
import type { SkillSnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  skills: SkillSnapshot[];
}

const SKILL_ICONS: Record<string, string> = {
  woodcutting: "🪓",
  mining: "⛏️",
  fishing: "🎣",
  combat: "⚔️",
  crafting: "🛠️",
};

export function SkillProgressionPanel({ skills }: Props) {
  if (!skills.length) {
    return (
      <section
        data-testid="skill-panel-empty"
        className="are-window"
        role="region"
        aria-label="Skill Progression"
      >
        <p className="are-text-muted">
          <span aria-hidden="true">⏳ </span>
          No live skill data yet.
        </p>
      </section>
    );
  }

  return (
    <section
      data-testid="skill-panel-live"
      className="are-window"
      role="region"
      aria-label="Skill Progression"
    >
      <div className="skill-list">
        {skills.map((skill) => {
          const percent = Math.round(skill.progressRatio * 100);
          const progressText = `${percent}% (${skill.xp} / ${skill.xpForNextLevel} XP)`;
          const tooltip = `${skill.title}: ${progressText}`;
          const icon = SKILL_ICONS[skill.id] || "⭐";

          return (
            <article key={skill.id} className="skill-row" data-testid={`skill-progress-${skill.id}`}>
              <div className="skill-row__header">
                <strong>
                  <span aria-hidden="true">{icon} </span>
                  {skill.title}
                </strong>
                <span className="skill-row__level">Lv. {skill.level}</span>
              </div>

              <div className="skill-row__xp">
                <span className="skill-row__xp-current">{skill.xp}</span>
                <span className="skill-row__xp-separator"> / </span>
                <span className="skill-row__xp-next">{skill.xpForNextLevel} XP</span>
              </div>

              <div
                className="skill-row__bar"
                role="progressbar"
                aria-label={`${skill.title} progress to level ${skill.level + 1}`}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuetext={progressText}
                title={tooltip}
              >
                <div
                  className="skill-row__fill"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}