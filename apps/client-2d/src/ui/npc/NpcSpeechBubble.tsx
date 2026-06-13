"use client";

import React from "react";
import type {
  NpcSpeechBubbleProps,
  SpeechBubbleVariant,
  EmotionType,
} from "./NpcUI.types";

// Diamond Glass CSS Keyframes
const SPEECH_BUBBLE_ANIMATIONS = `
  @keyframes npc-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-4px); }
  }
  @keyframes npc-fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes npc-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  @keyframes npc-glow-speaking {
    0%, 100% { box-shadow: 0 0 8px 2px rgba(0, 229, 255, 0.4); }
    50% { box-shadow: 0 0 16px 4px rgba(0, 229, 255, 0.6); }
  }
  @keyframes npc-glow-thinking {
    0%, 100% { box-shadow: 0 0 8px 2px rgba(157, 0, 255, 0.4); }
    50% { box-shadow: 0 0 16px 4px rgba(157, 0, 255, 0.6); }
  }
`;

const EMOTION_ICONS: Record<EmotionType, string> = {
  neutral: "○",
  happy: "◉",
  angry: "◆",
  confused: "◎",
  sad: "◈",
};

const VARIANT_COLORS: Record<SpeechBubbleVariant, { border: string; glow: string; icon: string }> = {
  speaking: {
    border: "#00e5ff",
    glow: "animate-glow-speaking",
    icon: "💬",
  },
  thinking: {
    border: "#9d00ff",
    glow: "animate-glow-thinking",
    icon: "💭",
  },
};

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export function NpcSpeechBubble({
  npcName,
  text,
  variant = "speaking",
  emotion = "neutral",
  maxLength = 200,
  isVisible = true,
  onDismiss,
}: NpcSpeechBubbleProps) {
  const [styleInjected, setStyleInjected] = React.useState(false);

  React.useEffect(() => {
    if (!styleInjected && !document.getElementById("npc-speech-bubble-styles")) {
      const style = document.createElement("style");
      style.id = "npc-speech-bubble-styles";
      style.textContent = SPEECH_BUBBLE_ANIMATIONS;
      document.head.appendChild(style);
      setStyleInjected(true);

      // Inject glow animations
      const glowStyle = document.createElement("style");
      glowStyle.textContent = `
        .animate-glow-speaking { animation: npc-glow-speaking 2s ease-in-out infinite; }
        .animate-glow-thinking { animation: npc-glow-thinking 2s ease-in-out infinite; }
      `;
      document.head.appendChild(glowStyle);
    }
  }, [styleInjected]);

  if (!isVisible) return null;

  const colors = VARIANT_COLORS[variant];
  const truncatedText = truncateText(text, maxLength);
  const isLongText = text.length > maxLength;

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        maxWidth: "280px",
        animation: "npc-fade-in 0.3s ease-out, npc-float 3s ease-in-out infinite",
      }}
    >
      {/* Main Bubble Panel */}
      <div
        className="relative"
        style={{
          backgroundColor: "rgba(13, 21, 22, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${colors.border}`,
          borderRadius: "0px", // Sharp corners - Diamond Glass
        }}
      >
        {/* Glow Effect */}
        <div
          className={`absolute inset-0 ${colors.glow}`}
          style={{ borderRadius: "0px", pointerEvents: "none" }}
        />

        {/* Content */}
        <div className="p-3">
          {/* Header: NPC Name + Emotion + Variant Icon */}
          <div
            className="flex items-center justify-between mb-2 pb-2"
            style={{ borderBottom: "1px solid rgba(132, 147, 150, 0.2)" }}
          >
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily: "Epilogue, sans-serif",
                  fontSize: "11px",
                  fontWeight: "600",
                  letterSpacing: "0.15em",
                  color: colors.border,
                  textTransform: "uppercase",
                }}
              >
                {npcName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Emotion Indicator */}
              <span
                style={{
                  fontSize: "12px",
                  color: "#bac9cc",
                }}
                title={`Emotion: ${emotion}`}
              >
                {EMOTION_ICONS[emotion]}
              </span>
              {/* Variant Indicator */}
              <span style={{ fontSize: "10px" }}>{colors.icon}</span>
            </div>
          </div>

          {/* Main Text */}
          <div
            style={{
              fontFamily: "Epilogue, sans-serif",
              fontSize: "14px",
              fontWeight: "400",
              lineHeight: "1.5",
              letterSpacing: "0.01em",
              color: "#dce4e5",
            }}
          >
            &ldquo;{truncatedText}&rdquo;
          </div>

          {/* Character Limit Indicator */}
          {isLongText && (
            <div
              className="mt-2 pt-2 flex justify-end"
              style={{ borderTop: "1px solid rgba(132, 147, 150, 0.1)" }}
            >
              <span
                style={{
                  fontFamily: "Epilogue, sans-serif",
                  fontSize: "10px",
                  color: "#849396",
                  letterSpacing: "0.05em",
                }}
              >
                {text.length}/{maxLength}
              </span>
            </div>
          )}
        </div>

        {/* Pointer Triangle */}
        <div
          className="absolute left-1/2 -bottom-3 transform -translate-x-1/2"
          style={{
            width: "0",
            height: "0",
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: `12px solid ${colors.border}`,
          }}
        >
          {/* Inner pointer (same color as bubble bg) */}
          <div
            className="absolute -top-1 -translate-x-1/2 left-1/2"
            style={{
              width: "0",
              height: "0",
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "10px solid rgba(13, 21, 22, 0.85)",
            }}
          />
        </div>

        {/* Dismiss Button (optional) */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center"
            style={{
              backgroundColor: "rgba(13, 21, 22, 0.9)",
              border: "1px solid #849396",
              borderRadius: "0px",
              color: "#849396",
              fontSize: "10px",
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default NpcSpeechBubble;