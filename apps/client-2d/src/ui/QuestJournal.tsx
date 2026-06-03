import React from "react";
import type { QuestState } from "../game/quests";

interface Props {
  open: boolean;
  quests: QuestState[];
  onClose: () => void;
  onTrack: (questId: string) => void;
}

export function QuestJournal({ open, quests, onClose, onTrack }: Props) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 42,
        width: "min(560px, 94vw)",
        maxHeight: "80dvh",
        overflow: "auto",
        padding: 16,
        borderRadius: 20,
        border: "1px solid rgba(57,255,20,.26)",
        background: "rgba(7,7,17,.92)",
        color: "#f5f7ff",
        backdropFilter: "blur(14px)"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>Quest Journal</h2>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,.1)",
            border: "1px solid rgba(255,255,255,.2)",
            borderRadius: 8,
            color: "#f5f7ff",
            cursor: "pointer",
            padding: "6px 12px"
          }}
        >
          ✕
        </button>
      </header>

      <div style={{ display: "grid", gap: 12 }}>
        {quests.map((quest) => (
          <article
            key={quest.id}
            style={{
              padding: 12,
              borderRadius: 14,
              border: quest.tracked
                ? "1px solid rgba(57,255,20,.45)"
                : "1px solid rgba(255,255,255,.12)",
              background: quest.tracked
                ? "rgba(57,255,20,.08)"
                : "rgba(255,255,255,.06)"
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>
              {quest.title}
              {quest.tracked && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    color: "#39ff14",
                    fontWeight: 400
                  }}
                >
                  [TRACKED]
                </span>
              )}
            </h3>
            <p style={{ opacity: 0.7, margin: "0 0 8px 0", fontSize: 13 }}>
              {quest.description}
            </p>
            <small
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 6,
                background:
                  quest.status === "completed"
                    ? "rgba(57,255,20,.2)"
                    : "rgba(255,255,255,.1)",
                fontSize: 11
              }}
            >
              Status: {quest.status}
            </small>

            {quest.objectives.length > 0 && (
              <ul
                style={{
                  marginTop: 10,
                  paddingLeft: 18,
                  fontSize: 12
                }}
              >
                {quest.objectives.map((objective) => (
                  <li key={objective.id}>
                    {objective.label}: {objective.current}/{objective.required}
                    {objective.current >= objective.required && (
                      <span style={{ color: "#39ff14", marginLeft: 4 }}>✓</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!quest.tracked && (
              <button
                type="button"
                onClick={() => onTrack(quest.id)}
                style={{
                  marginTop: 8,
                  padding: "4px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(57,255,20,.3)",
                  background: "rgba(57,255,20,.15)",
                  color: "#f5f7ff",
                  cursor: "pointer",
                  fontSize: 12
                }}
              >
                Track
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}