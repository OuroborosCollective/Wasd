export const ARELORIA_THEME = {
  cyberZen: {
    bg: "#070711",
    panel: "#101021",
    cyan: "#00E5FF",
    green: "#39FF14",
    fire: "#FF7A00",
    danger: "#FF416C",
    text: "#F5F7FF",
    muted: "rgba(245,247,255,0.68)"
  },

  roles: {
    authRoot: "Deterministic Gateway",
    scienceHub: "Research / Skill / Craft",
    chainValidator: "State Validation",
    cyberGlobe: "World Map",
    fireOuroboros: "Combat / Boss / Danger",
    areLogik: "Simulation / Kernel / Truth",
    mobileDash: "Android HUD",
    routeSelector: "Portal / Navigation"
  }
} as const;

export type AreloriaThemeName = keyof typeof ARELORIA_THEME;

export const BOOT_PHASES = {
  BOOTING: "BOOTING",
  CHECKING_DEVICE: "CHECKING_DEVICE",
  CHECKING_SERVER: "CHECKING_SERVER",
  LOADING_ASSETS: "LOADING_ASSETS",
  CONNECTING_WORLD: "CONNECTING_WORLD",
  SYNCING_TICK: "SYNCING_TICK",
  READY: "READY",
  DEGRADED: "DEGRADED",
  OFFLINE: "OFFLINE",
  FATAL: "FATAL"
} as const;

export type BootPhase = (typeof BOOT_PHASES)[keyof typeof BOOT_PHASES];