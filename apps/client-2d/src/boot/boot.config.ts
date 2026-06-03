export type AreloriaBootMode = "development" | "staging" | "production";

export interface AreloriaBootConfig {
  appName: string;
  clientId: "REAL_PIXI_CLIENT";
  engine: "PIXI_2D";
  logicHz: number;
  renderMaxFps: number;
  mode: AreloriaBootMode;

  network: {
    wsUrl: string;
    healthUrl: string;
    reconnectMinMs: number;
    reconnectMaxMs: number;
    heartbeatMs: number;
  };

  world: {
    chunkSize: number;
    observerRadiusChunks: number;
    interpolationMs: number;
    maxPredictionMs: number;
  };

  design: {
    theme: "cyber_zen" | "fire_ouroboros" | "science_hub";
    showBootOverlay: boolean;
    showDebugHud: boolean;
  };

  are: {
    enabled: boolean;
    kappaInvariant: number;
    plexityGate: boolean;
    ouroborosLoop: boolean;
  };
}

function env(name: string, fallback: string): string {
  const value = import.meta.env[name];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export const ARELORIA_BOOT_CONFIG: AreloriaBootConfig = {
  appName: "Areloria",
  clientId: "REAL_PIXI_CLIENT",
  engine: "PIXI_2D",
  logicHz: 10,
  renderMaxFps: 60,
  mode: env("VITE_ARELORIA_MODE", "production") as AreloriaBootMode,

  network: {
    wsUrl: env("VITE_WS_URL", "ws://localhost:3001/ws"),
    healthUrl: env("VITE_HEALTH_URL", "/health"),
    reconnectMinMs: 750,
    reconnectMaxMs: 8000,
    heartbeatMs: 5000
  },

  world: {
    chunkSize: 64,
    observerRadiusChunks: 3,
    interpolationMs: 120,
    maxPredictionMs: 250
  },

  design: {
    theme: "cyber_zen",
    showBootOverlay: true,
    showDebugHud: import.meta.env.DEV
  },

  are: {
    enabled: true,
    kappaInvariant: 1000,
    plexityGate: true,
    ouroborosLoop: true
  }
};