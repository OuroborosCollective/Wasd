import React from "react";
import type { SkillId, SkillState } from "../game/skills";
import { SKILL_DEFINITIONS } from "../game/skills";

interface Props {
  skills: Record<SkillId, SkillState>;
  onSkill: (skillId: SkillId) => void;
  onInventory: () => void;
  onQuest: () => void;
  onEquipment: () => void;
}

export function MobileActionBar({
  skills,
  onSkill,
  onInventory,
  onQuest,
  onEquipment
}: Props) {
  const skillIds: SkillId[] = ["primary", "impact_buster", "interact", "pickup"];

  return (
    <div
      role="toolbar"
      aria-label="Mobile action controls"
      style={{
        position: "fixed",
        right: 16,
        bottom: 24,
        zIndex: 18,
        display: "grid",
        gap: 8,
        pointerEvents: "auto"
      }}
    >
      {skillIds.map((skillId) => {
        const state = skills[skillId];
        const def = SKILL_DEFINITIONS[skillId];
        const disabled = state.cooldownRemainingTicks > 0;
        const cooldownText = disabled ? ` (Cooldown: ${state.cooldownRemainingTicks} ticks)` : "";

        return (
          <button
            key={skillId}
            type="button"
            disabled={disabled}
            aria-label={`${def.label} skill${disabled ? ` (Cooldown ${state.cooldownRemainingTicks} ticks)` : ""}`}
            title={`${def.label}${cooldownText}`}
            onPointerDown={(event) => {
              event.preventDefault();
              onSkill(skillId);
            }}
            style={{
              width: 82,
              height: 48,
              borderRadius: 14,
              border: "1px solid rgba(0,229,255,.28)",
              background: disabled
                ? "rgba(255,255,255,.08)"
                : "rgba(0,229,255,.22)",
              color: "#f5f7ff",
              fontWeight: 800,
              touchAction: "none"
            }}
          >
            <div>{def.label}</div>
            {disabled && (
              <small>{state.cooldownRemainingTicks}</small>
            )}
          </button>
        );
      })}

      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={onInventory}
          aria-label="Open Inventory"
          title="Open Inventory (I)"
          aria-keyshortcuts="i"
          style={{
            width: 48,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(0,229,255,.28)",
            background: "rgba(0,229,255,.18)",
            color: "#f5f7ff",
            fontWeight: 700,
            fontSize: 11
          }}
        >
          INV
        </button>
        <button
          type="button"
          onClick={onEquipment}
          aria-label="Open Equipment"
          title="Open Equipment (E)"
          aria-keyshortcuts="e"
          style={{
            width: 48,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(255,122,0,.28)",
            background: "rgba(255,122,0,.18)",
            color: "#f5f7ff",
            fontWeight: 700,
            fontSize: 11
          }}
        >
          EQ
        </button>
        <button
          type="button"
          onClick={onQuest}
          aria-label="Open Quests"
          title="Open Quests (Q)"
          aria-keyshortcuts="q"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid rgba(57,255,20,.28)",
            background: "rgba(57,255,20,.18)",
            color: "#f5f7ff",
            fontWeight: 700,
            fontSize: 11
          }}
        >
          Q
        </button>
      </div>
    </div>
  );
}
