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

export function SkillProgressionPanel({ skills }: Props) {
  if (!skills.length) {
    return (
      <section
        data-testid="skill-panel-empty"
        className="are-window"
        role="region"
        aria-label="Skill Progression"
      >
        <p className="are-text-muted" role="status" aria-live="polite">
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
          const xpText = `${skill.xp} / ${skill.xpForNextLevel} XP (${percent}%)`;
          return (
            <article key={skill.id} className="skill-row" data-testid={`skill-progress-${skill.id}`}>
              <div className="skill-row__header">
                <strong>{skill.title}</strong>
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
                aria-valuetext={xpText}
                title={xpText}
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