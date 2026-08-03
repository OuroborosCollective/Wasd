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

  React.useEffect(() => {
    if (!isOpen) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (dialogue.canContinue && onContinue && (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E")) {
        e.preventDefault();
        e.stopPropagation();
        onContinue();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [isOpen, dialogue.canContinue, onContinue, onClose]);

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
          position: "fixed",
          inset: 0,
          zIndex: 4000,
          backgroundColor: "rgba(8, 15, 17, 0.7)",
          backdropFilter: "blur(4px)",
          animation: "backdrop-fade 0.2s ease-out",
        }}
      />

      <div
        className="fixed z-50"
        style={{
          position: "fixed",
          zIndex: 4010,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(94vw, 760px)",
          maxHeight: "86vh",
          overflowY: "auto",
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
            style={{ position: "absolute", inset: 0, border: "1px solid rgba(0, 229, 255, 0.1)", borderRadius: "0px" }}
          />

          <div className="relative" style={{ position: "relative" }}>
            <div
              className="flex items-center justify-between p-4"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid rgba(132, 147, 150, 0.2)" }}
            >
              <div className="flex flex-col gap-1" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                <div className="flex items-center gap-2" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                aria-label="Close dialogue [ESC]"
                aria-keyshortcuts="Escape"
                className="flex items-center justify-center"
                style={{
                  minWidth: 40,
                  width: "auto",
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(132, 147, 150, 0.3)",
                  borderRadius: "0px",
                  color: "#849396",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                  padding: "0 8px",
                  gap: 4,
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
                <kbd className="cz-kbd" aria-hidden="true" style={{ margin: 0 }}>ESC</kbd>
                ✕
              </button>
            </div>

            <div className="flex flex-col md:flex-row" style={{ display: "flex", flexWrap: "wrap" }}>
              <div className="flex-1 p-4 md:border-r" style={{ flex: "1 1 340px", padding: 16, borderRight: "1px solid rgba(132, 147, 150, 0.2)" }}>
                <div
                  className="mb-4 relative overflow-hidden flex items-center justify-center"
                  style={{
                    marginBottom: 16,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "min(28vh, 220px)",
                    backgroundColor: "#0a0f11",
                    border: "1px solid rgba(0, 229, 255, 0.2)",
                    borderRadius: "0px",
                  }}
                >
                  {npc.portraitUrl ? (
                    <img src={npc.portraitUrl} alt={npc.name} className="w-full h-full object-cover" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                  ) : (
                    <NpcPortrait npcId={npc.id} npcName={npc.name} role={npc.role} size="large" />
                  )}
                  <div className="absolute inset-0 pointer-events-none" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(13, 21, 22, 0.45), transparent)" }} />
                </div>

                <div
                  className="p-3"
                  style={{
                    padding: 12,
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
                    <button
                      type="button"
                      aria-label="Continue dialogue [Space, Enter, or E]"
                      className="mt-3 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff]"
                      style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        background: "none",
                        border: "none",
                        padding: 0,
                        transition: "all 0.2s ease",
                      }}
                      onClick={onContinue}
                    >
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
                      <kbd className="cz-kbd" style={{ marginLeft: 4, fontSize: "10px", padding: "1px 4px" }}>E</kbd>
                    </button>
                  )}

                  {dialogue.isFinished && (
                    <div className="mt-3 pt-3" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(132, 147, 150, 0.2)" }}>
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

              <div className="w-full md:w-[40%] p-4 flex flex-col gap-4" style={{ width: "min(100%, 300px)", flex: "1 1 260px", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
                <NpcInteractionMenu
                  items={menuItems}
                  selectedIndex={selectedIndex}
                  onSelect={(index) => setSelectedIndex(index)}
                  onConfirm={(index) => handleAction(menuItems[index]?.action ?? "goodbye")}
                  onCancel={onClose}
                />

                {quest && (
                  <div className="p-3" style={{ padding: 12, backgroundColor: "rgba(21, 29, 30, 0.6)", border: "1px solid rgba(80, 200, 120, 0.3)", borderRadius: "0px" }}>
                    <div className="flex items-center gap-2 mb-2" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "Epilogue, sans-serif", fontSize: "10px", fontWeight: "600", letterSpacing: "0.2em", color: quest.isNew ? "#50c878" : "#849396", textTransform: "uppercase" }}>
                        {quest.isNew ? "● NEW QUEST" : "QUEST AVAILABLE"}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "Epilogue, sans-serif", fontSize: "14px", fontWeight: "700", color: "#dce4e5", margin: "0 0 4px 0" }}>{quest.name}</h3>
                    <p style={{ fontFamily: "Epilogue, sans-serif", fontSize: "12px", color: "#bac9cc", margin: "0 0 8px 0", lineHeight: "1.4" }}>{quest.objective}</p>
                    <div className="pt-2" style={{ paddingTop: 8, borderTop: "1px solid rgba(132, 147, 150, 0.2)" }}>
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
