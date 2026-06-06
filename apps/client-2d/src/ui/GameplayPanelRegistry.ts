// Central registry for all gameplay panels
// Provides single source of truth for panel IDs, titles, shortcuts, and test IDs

export type GameplayPanelId =
  | "character"
  | "skills"
  | "resources"
  | "inventory"
  | "crafting"
  | "equipment"
  | "modules"
  | "heartbeat"
  | "selfheal";

export interface GameplayPanelRegistration {
  id: GameplayPanelId;
  title: string;
  shortcut: string;
  testId: string;
  defaultOpen?: boolean;
  mobileDefaultOpen?: boolean;
  requiresLiveSnapshot?: boolean;
}

export const GAMEPLAY_PANEL_REGISTRY: readonly GameplayPanelRegistration[] = [
  {
    id: "character",
    title: "Character",
    shortcut: "P",
    testId: "character-paperdoll-root",
    defaultOpen: true,
    mobileDefaultOpen: true,
    requiresLiveSnapshot: true,
  },
  {
    id: "skills",
    title: "Skills",
    shortcut: "K",
    testId: "skill-panel-live",
    defaultOpen: false,
    mobileDefaultOpen: false,
    requiresLiveSnapshot: true,
  },
  {
    id: "resources",
    title: "Resources",
    shortcut: "R",
    testId: "resource-panel-live",
    defaultOpen: false,
    mobileDefaultOpen: false,
    requiresLiveSnapshot: true,
  },
  {
    id: "inventory",
    title: "Inventory",
    shortcut: "I",
    testId: "inventory-panel-live",
    defaultOpen: false,
    mobileDefaultOpen: false,
    requiresLiveSnapshot: true,
  },
  {
    id: "crafting",
    title: "Crafting",
    shortcut: "C",
    testId: "crafting-panel-live",
    defaultOpen: false,
    mobileDefaultOpen: false,
    requiresLiveSnapshot: true,
  },
  {
    id: "equipment",
    title: "Equipment",
    shortcut: "E",
    testId: "equipment-panel-live",
    defaultOpen: false,
    mobileDefaultOpen: false,
    requiresLiveSnapshot: true,
  },
  {
    id: "modules",
    title: "Modules",
    shortcut: "M",
    testId: "module-registry-panel",
    defaultOpen: false,
    mobileDefaultOpen: false,
  },
  {
    id: "heartbeat",
    title: "ARE",
    shortcut: "H",
    testId: "are-heartbeat-panel",
    defaultOpen: false,
    mobileDefaultOpen: false,
  },
  {
    id: "selfheal",
    title: "SelfHeal",
    shortcut: "V",
    testId: "selfheal-workshop-panel",
    defaultOpen: false,
    mobileDefaultOpen: false,
  },
] as const;

export function getPanelByShortcut(key: string): GameplayPanelRegistration | null {
  const normalized = key.trim().toLowerCase();

  return (
    GAMEPLAY_PANEL_REGISTRY.find(
      (panel) => panel.shortcut.toLowerCase() === normalized,
    ) ?? null
  );
}

export function getPanelById(id: GameplayPanelId): GameplayPanelRegistration | null {
  return (
    GAMEPLAY_PANEL_REGISTRY.find((panel) => panel.id === id) ?? null
  );
}