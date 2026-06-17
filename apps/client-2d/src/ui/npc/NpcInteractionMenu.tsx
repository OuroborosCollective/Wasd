"use client";

import React from "react";
import type { NpcInteractionMenuProps, NpcMenuItem, MenuItemColor } from "./NpcUI.types";

// Color mappings for menu items
const COLOR_MAP: Record<MenuItemColor, { border: string; glow: string; text: string }> = {
  cyan: {
    border: "#00e5ff",
    glow: "rgba(0, 229, 255, 0.3)",
    text: "#00e5ff",
  },
  green: {
    border: "#50c878",
    glow: "rgba(80, 200, 120, 0.3)",
    text: "#50c878",
  },
  orange: {
    border: "#ff7a00",
    glow: "rgba(255, 122, 0, 0.3)",
    text: "#ff7a00",
  },
  violet: {
    border: "#9d00ff",
    glow: "rgba(157, 0, 255, 0.3)",
    text: "#9d00ff",
  },
  gray: {
    border: "#849396",
    glow: "rgba(132, 147, 150, 0.2)",
    text: "#849396",
  },
};

// Staggered entrance animations
const MENU_ANIMATIONS = `
  @keyframes menu-item-enter {
    from { 
      opacity: 0; 
      transform: translateX(-10px); 
    }
    to { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }
  @keyframes menu-hover-glow {
    0%, 100% { box-shadow: 0 0 4px 1px var(--glow-color); }
    50% { box-shadow: 0 0 8px 2px var(--glow-color); }
  }
  @keyframes notification-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
  @keyframes menu-selected-scale {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
`;

export function NpcInteractionMenu({
  items,
  selectedIndex,
  onSelect,
  onConfirm,
  onCancel,
}: NpcInteractionMenuProps) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [stylesInjected, setStylesInjected] = React.useState(false);

  React.useEffect(() => {
    if (!stylesInjected) {
      const style = document.createElement("style");
      style.id = "npc-menu-animations";
      style.textContent = MENU_ANIMATIONS;
      document.head.appendChild(style);
      setStylesInjected(true);
    }
  }, [stylesInjected]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "s") {
        e.preventDefault();
        const nextIndex = (selectedIndex + 1) % items.length;
        onSelect(nextIndex);
      } else if (e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        const prevIndex = selectedIndex === 0 ? items.length - 1 : selectedIndex - 1;
        onSelect(prevIndex);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onConfirm();
      } else if (e.key === "Escape" || e.key === "0") {
        e.preventDefault();
        onCancel();
      }
    },
    [selectedIndex, items.length, onSelect, onConfirm, onCancel]
  );

  React.useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="flex flex-col gap-2"
      role="menu"
      aria-label="NPC Interaction Menu"
    >
      {items.map((item, index) => {
        const colors = COLOR_MAP[item.color];
        const isHovered = hoveredIndex === index;
        const isSelected = selectedIndex === index;
        const isDisabled = item.isDisabled;

        return (
          <button
            key={item.action}
            className="relative group"
            disabled={isDisabled}
            onClick={() => !isDisabled && onSelect(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            role="menuitem"
            aria-label={`${item.label} (Shortcut ${item.shortcut})`}
            aria-keyshortcuts={item.shortcut}
            style={{
              // Animation: staggered entrance
              animation: `menu-item-enter 0.3s ease-out ${index * 0.05}s both`,

              // Base styles
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              width: "100%",
              backgroundColor: isSelected || isHovered
                ? `${colors.glow}`
                : "rgba(21, 29, 30, 0.6)",
              border: `1px solid ${isDisabled ? "rgba(132, 147, 150, 0.3)" : colors.border}`,
              borderRadius: "0px", // Sharp corners - Diamond Glass
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.5 : 1,

              // Selected/Hover glow effect
              boxShadow: isSelected
                ? `0 0 12px 2px ${colors.glow}`
                : isHovered
                  ? `0 0 8px 1px ${colors.glow}`
                  : "none",

              // Transform on hover/select
              transform: isSelected
                ? "scale(1.02)"
                : isHovered
                  ? "translateY(-2px)"
                  : "none",

              // Transition
              transition: "all 0.2s ease",

              // Custom property for glow animation
              ["--glow-color" as string]: colors.glow,
            }}
          >
            {/* Left: Icon + Label */}
            <div className="flex items-center gap-3">
              {/* Color Indicator Bar */}
              <div
                style={{
                  width: "3px",
                  height: "16px",
                  backgroundColor: isDisabled ? "#3b494c" : colors.border,
                  borderRadius: "0px",
                }}
              />

              {/* Menu Icon */}
              <span
                style={{
                  fontSize: "16px",
                  color: isDisabled ? "#3b494c" : colors.text,
                }}
              >
                {item.color === "cyan" && "💬"}
                {item.color === "green" && "📜"}
                {item.color === "orange" && "🛒"}
                {item.color === "violet" && "⚔️"}
                {item.color === "gray" && "👋"}
              </span>

              {/* Label */}
              <span
                style={{
                  fontFamily: "Epilogue, sans-serif",
                  fontSize: "13px",
                  fontWeight: isSelected || isHovered ? "700" : "600",
                  letterSpacing: "0.1em",
                  color: isDisabled ? "#3b494c" : isSelected || isHovered ? colors.text : "#dce4e5",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </span>

              {/* Notification Dot */}
              {item.hasNotification && (
                <span
                  style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "0px",
                    backgroundColor: "#50c878",
                    animation: "notification-pulse 1.5s ease-in-out infinite",
                  }}
                />
              )}
            </div>

            {/* Right: Shortcut */}
            <div
              style={{
                fontFamily: "Epilogue, sans-serif",
                fontSize: "11px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                color: "#3b494c",
                padding: "2px 6px",
                border: "1px solid #3b494c",
                borderRadius: "0px",
              }}
            >
              [{item.shortcut}]
            </div>

            {/* Selected Indicator */}
            {isSelected && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{
                  backgroundColor: colors.border,
                  animation: "menu-selected-scale 0.3s ease-out",
                }}
              />
            )}
          </button>
        );
      })}

      {/* Hint Text */}
      <div
        className="mt-2 text-center"
        style={{
          fontFamily: "Epilogue, sans-serif",
          fontSize: "10px",
          fontWeight: "400",
          letterSpacing: "0.1em",
          color: "#3b494c",
          textTransform: "uppercase",
        }}
      >
        ↑↓ Navigate • Enter Select • Esc Close
      </div>
    </div>
  );
}

export default NpcInteractionMenu;