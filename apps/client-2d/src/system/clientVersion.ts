export const CLIENT_VERSION = {
  name: "Areloria 2D",
  client: "REAL_PIXI_CLIENT",
  phase: "PHASE_2_PLAYABLE_CLIENT",
  engine: "PIXI_2D",
  buildMode: import.meta.env.MODE,
  gitSha: import.meta.env.VITE_GIT_SHA ?? "local",
  builtAt: import.meta.env.VITE_BUILT_AT ?? "dev"
} as const;