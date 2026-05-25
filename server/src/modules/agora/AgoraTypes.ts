export type AgoraRole = "public" | "backer" | "admin";

export type AgoraOAuthConfigStatus = {
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  callbackConfigured: boolean;
  collectiveSlug: string;
  projectSlug: string;
};

export type AgoraLiveStatus = {
  ok: boolean;
  status: "initializing" | "ok" | "degraded";
  project: string;
  monitor: string;
  uptimeSeconds: number;
  port: number;
  buildHash: string;
  nodeEnv: string;
  openCollective: AgoraOAuthConfigStatus;
  persistence?: unknown;
  are?: {
    guard?: unknown;
    worldHash?: string | null;
    replay?: unknown;
  };
  warfront?: unknown;
};

export type AgoraFinanceSummary = {
  configured: boolean;
  collectiveSlug: string;
  projectSlug: string;
  note: string;
};
