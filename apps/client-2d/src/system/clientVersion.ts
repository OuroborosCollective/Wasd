export const CLIENT_VERSION = {
  name: "Areloria 2D",
  client: "REAL_PIXI_CLIENT",
  phase: "PHASE_7_IDENTITY_STABLE_OWNERSHIP",
  engine: "PIXI_2D",
  buildMode: import.meta.env.MODE,
  gitSha: import.meta.env.VITE_GIT_SHA ?? "local",
  builtAt: import.meta.env.VITE_BUILT_AT ?? "dev"
} as const;