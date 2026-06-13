"use client";

// NPC UI Types for Areloria 2D Client - Diamond Glass Design System

export type SpeechBubbleVariant = "speaking" | "thinking";
export type EmotionType = "neutral" | "happy" | "angry" | "confused" | "sad";
export type MenuAction = "talk" | "quests" | "trade" | "faction" | "goodbye";
export type MenuItemColor = "cyan" | "green" | "orange" | "violet" | "gray";
export type AnimationState = "idle" | "hover" | "selected" | "disabled";

export interface NpcSpeechBubbleProps {
  readonly npcName: string;
  readonly text: string;
  readonly variant?: SpeechBubbleVariant;
  readonly emotion?: EmotionType;
  readonly maxLength?: number;
  readonly isVisible?: boolean;
  readonly onDismiss?: () => void;
}

export interface NpcInfo {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly faction: string;
  readonly portraitUrl?: string;
}

export interface DialogueState {
  readonly currentText: string;
  readonly canContinue: boolean;
  readonly isFinished?: boolean;
}

export interface QuestPreview {
  readonly name: string;
  readonly description: string;
  readonly objective: string;
  readonly reward: string;
  readonly isNew?: boolean;
}

export interface NpcContextWindowProps {
  readonly isOpen: boolean;
  readonly npc: NpcInfo;
  readonly dialogue: DialogueState;
  readonly quest?: QuestPreview | null;
  readonly onClose: () => void;
  readonly onAction: (action: MenuAction) => void;
  readonly onContinue?: () => void;
}

export interface NpcMenuItem {
  readonly action: MenuAction;
  readonly label: string;
  readonly shortcut: string;
  readonly color: MenuItemColor;
  readonly hasNotification?: boolean;
  readonly isDisabled?: boolean;
}

export interface NpcInteractionMenuProps {
  readonly items: readonly NpcMenuItem[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export interface NpcContextWindowDefaultProps {
  readonly npc: NpcInfo;
  readonly dialogue: DialogueState;
  readonly quest?: QuestPreview | null;
}

// Design System Constants
export const NPC_UI_COLORS = {
  // Backgrounds
  background: "#0d1516",
  surface: "#0d1516",
  surfaceDim: "#0d1516",
  surfaceBright: "#333a3c",
  surfaceContainerLowest: "#080f11",
  surfaceContainerLow: "#151d1e",
  surfaceContainer: "#192122",
  surfaceContainerHigh: "#242b2d",
  surfaceContainerHighest: "#2e3638",

  // Primary - Mana Cyan
  primary: "#00e5ff",
  primaryContainer: "#00e5ff",
  onPrimary: "#00363d",

  // Secondary - Void Violet
  secondary: "#9d00ff",
  secondaryContainer: "#9d05ff",
  onSecondary: "#4b007e",

  // Tertiary - Lexicon Green
  tertiary: "#50c878",
  tertiaryContainer: "#71e894",
  onTertiary: "#003919",

  // Warning - Sunset Orange
  warning: "#ff7a00",
  error: "#ffb4ab",

  // On Surface
  onSurface: "#dce4e5",
  onSurfaceVariant: "#bac9cc",

  // Outline
  outline: "#849396",
  outlineVariant: "#3b494c",
} as const;

export const NPC_UI_TYPOGRAPHY = {
  displayLg: {
    fontFamily: "Epilogue",
    fontSize: "42px",
    fontWeight: "800",
    lineHeight: "1.1",
    letterSpacing: "0.1em",
  },
  headlineMd: {
    fontFamily: "Epilogue",
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "1.2",
    letterSpacing: "0.05em",
  },
  headlineSm: {
    fontFamily: "Epilogue",
    fontSize: "20px",
    fontWeight: "600",
    lineHeight: "1.3",
    letterSpacing: "0.05em",
  },
  bodyLg: {
    fontFamily: "Epilogue",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: "1.6",
    letterSpacing: "0.02em",
  },
  bodySm: {
    fontFamily: "Epilogue",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "1.5",
    letterSpacing: "0.01em",
  },
  labelCaps: {
    fontFamily: "Epilogue",
    fontSize: "12px",
    fontWeight: "600",
    lineHeight: "1",
    letterSpacing: "0.15em",
  },
  monoValue: {
    fontFamily: "Epilogue",
    fontSize: "13px",
    fontWeight: "500",
    lineHeight: "1",
    letterSpacing: "0.05em",
  },
} as const;