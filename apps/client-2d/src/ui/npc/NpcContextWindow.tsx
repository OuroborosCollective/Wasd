"use client";

import React from "react";
import type {
  NpcContextWindowProps,
  QuestPreview,
  MenuAction,
} from "./NpcUI.types";
import { NpcInteractionMenu } from "./NpcInteractionMenu";
import { NpcPortrait } from "./NpcPortrait";

const CONTEXT_WINDOW_ANIMATIONS = `
  @keyframes context-appear {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes backdrop-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes dialogue-cursor {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
`;

export function NpcContextWindow({
  isOpen,
  npc,
  dialogue,
  quest,
  onClose,
  onAction,
  onContinue,
}: NpcContextWindowProps) {
  const [styleInjected, setStyleInjected] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!styleInjected && !document.getElementById("npc-context-styles")) {
      const style = document.createElement("style");
      style.id = "npc-context-styles";
      style.textContent = CONTEXT_WINDOW_ANIMATIONS;
      document.head.appendChild(style);
      setStyleInjected(true);
    }
  }, [styleInjected]);

  const handleAction = (action: MenuAction) => {
    onAction(action);
  };

  const menuItems = [
    { action: "talk" as MenuAction, label: "TALK", shortcut: "1", color: "cyan" as const, hasNotification: false },
    { action: "quests" as MenuAction, label: "QUESTS", shortcut: "2", color: "green" as const, hasNotification: !!quest },
    { action: "trade" as MenuAction, label: "TRADE", shortcut: "3", color: "orange" as const, hasNotification: false },
    { action: "faction" as MenuAction, label: "FACTION", shortcut: "4", color: "violet" as const, hasNotification: false },
    { action: "goodbye" as MenuAction, label: "GOODBYE", shortcut: "0", color: "gray" as const, hasNotification: false },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{
          backgroundColor: "rgba(8, 15, 17, 0.7)",
          backdropFilter: "blur(4px)",
          animation: "backdrop-fade 0.2s ease-out",
        }}
      />

      <div
        className="fixed z-50"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(90vw, 720px)",
          maxHeight: "80vh",
          animation: "context-appear 0.3s ease-out",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(13, 21, 22, 0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(0, 229, 255, 0.3)",
            borderRadius: "0px",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ border: "1px solid rgba(0, 229, 255, 0.1)", borderRadius: "0px" }}
          />

          <div className="relative">
            <div
              className="flex items-center justify-between p-4"
              style={{ borderBottom: "1px solid rgba(132, 147, 150, 0.2)" }}
            >
              <div className="flex flex-col gap-1">
                <h2
                  style={{
                    fontFamily: "Epilogue, sans-serif",
                    fontSize: "20px",
                    fontWeight: "700",
                    letterSpacing: "0.05em",
                    color: "#dce4e5",
                    margin: 0,
                  }}
                >
                  {npc.name}
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily: "Epilogue, sans-serif",
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "0.15em",
                      color: "#849396",
                      textTransform: "uppercase",
                    }}
                  >
                    {npc.role}
                  </span>
                  <span style={{ color: "#3b494c" }}>|</span>
                  <span
                    style={{
                      fontFamily: "Epilogue, sans-serif",
                      fontSize: "11px",
                      fontWeight: "600",
                      letterSpacing: "0.15em",
                      color: "#9d00ff",
                      textTransform: "uppercase",
                    }}
                  >
                    {npc.faction}
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid rgba(132, 147, 150, 0.3)",
                  borderRadius: "0px",
                  color: "#849396",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#00e5ff";
                  e.currentTarget.style.color = "#00e5ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(132, 147, 150, 0.3)";
                  e.currentTarget.style.color = "#849396";
                }}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-4 md:border-r" style={{ borderRight: "1px solid rgba(132, 147, 150, 0.2)" }}>
                <div
                  className="mb-4 relative overflow-hidden flex items-center justify-center"
                  style={{
                    height: "220px",
                    backgroundColor: "#0a0f11",
                    border: "1px solid rgba(0, 229, 255, 0.2)",
                    borderRadius: "0px",
                  }}
                >
                  {npc.portraitUrl ? (
                    <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" style={{ opacity: 0.9 }} />
                  ) : (
                    <NpcPortrait npcId={npc.id} npcName={npc.name} role={npc.role} size="large" />
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(13, 21, 22, 0.45), transparent)" }} />
                </div>

                <div
                  className="p-3"
                  style={{
                    backgroundColor: "rgba(21, 29, 30, 0.6)",
                    border: "1px solid rgba(0, 229, 255, 0.15)",
                    borderRadius: "0px",
                    minHeight: "100px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Epilogue, sans-serif",
                      fontSize: "14px",
                      fontWeight: "400",
                      lineHeight: "1.6",
                      letterSpacing: "0.01em",
                      color: "#dce4e5",
                      margin: 0,
                    }}
                  >
                    {dialogue.currentText}
                  </p>

                  {dialogue.canContinue && (
                    <div className="mt-3 flex items-center gap-2" style={{ cursor: "pointer" }} onClick={onContinue}>
                      <span style={{ display: "inline-block", width: "8px", height: "8px", backgroundColor: "#00e5ff", animation: "dialogue-cursor 1s ease-in-out infinite" }} />
                      <span
                        style={{
                          fontFamily: "Epilogue, sans-serif",
                          fontSize: "11px",
                          fontWeight: "600",
                          letterSpacing: "0.15em",
                          color: "#00e5ff",
                          textTransform: "uppercase",
                        }}
                      >
                        Continue
                      </span>
                    </div>
                  )}

                  {dialogue.isFinished && (
                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(132, 147, 150, 0.2)" }}>
                      <span
                        style={{
                          fontFamily: "Epilogue, sans-serif",
                          fontSize: "11px",
                          fontWeight: "600",
                          letterSpacing: "0.15em",
                          color: "#50c878",
                          textTransform: "uppercase",
                        }}
                      >
                        Dialogue Complete
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-[40%] p-4 flex flex-col gap-4">
                <NpcInteractionMenu
                  items={menuItems}
                  selectedIndex={selectedIndex}
                  onSelect={(index) => setSelectedIndex(index)}
                  onConfirm={() => handleAction(menuItems[selectedIndex]?.action ?? "goodbye")}
                  onCancel={onClose}
                />

                {quest && (
                  <div className="p-3" style={{ backgroundColor: "rgba(21, 29, 30, 0.6)", border: "1px solid rgba(80, 200, 120, 0.3)", borderRadius: "0px" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontFamily: "Epilogue, sans-serif", fontSize: "10px", fontWeight: "600", letterSpacing: "0.2em", color: quest.isNew ? "#50c878" : "#849396", textTransform: "uppercase" }}>
                        {quest.isNew ? "● NEW QUEST" : "QUEST AVAILABLE"}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "Epilogue, sans-serif", fontSize: "14px", fontWeight: "700", color: "#dce4e5", margin: "0 0 4px 0" }}>{quest.name}</h3>
                    <p style={{ fontFamily: "Epilogue, sans-serif", fontSize: "12px", color: "#bac9cc", margin: "0 0 8px 0", lineHeight: "1.4" }}>{quest.objective}</p>
                    <div className="pt-2" style={{ borderTop: "1px solid rgba(132, 147, 150, 0.2)" }}>
                      <span style={{ fontFamily: "Epilogue, sans-serif", fontSize: "10px", fontWeight: "600", letterSpacing: "0.15em", color: "#ff7a00", textTransform: "uppercase" }}>
                        Reward: {quest.reward}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default NpcContextWindow;
