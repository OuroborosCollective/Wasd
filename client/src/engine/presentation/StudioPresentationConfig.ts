export type StudioPresentation3D = {
  kind?: string;
  modelUrl?: string;
  runtimeAssetId?: string;
  scale?: number;
  rotationOffset?: { x?: number; y?: number; z?: number };
  positionOffset?: { x?: number; y?: number; z?: number };
};

export type StudioRender3DProfile = {
  hardwareScalingLevel?: number;
  maxFps?: number;
  antialias?: boolean;
  shadows?: boolean;
  particles?: boolean;
  fog?: boolean;
  toneMapping?: boolean;
  textureQuality?: "low" | "medium" | "high" | "ultra" | string;
  lodBias?: number;
  renderDistance?: "near" | "normal" | "far" | string;
};

type Binding = {
  bindingId: string;
  targetType: string;
  targetId: string;
  enabled?: boolean;
  presentation3d?: StudioPresentation3D | null;
};

export type StudioPresentationFeed = {
  presentationSha256?: string;
  renderProfilesSha256?: string;
  presentation?: {
    bindings?: Binding[];
    fallbacks?: Record<string, { presentation3d?: StudioPresentation3D }>;
  };
  renderProfiles?: {
    active?: { client3d?: string };
    profiles?: Record<string, { client3d?: StudioRender3DProfile }>;
  };
};

type Listener = (feed: StudioPresentationFeed | null) => void;

const FEED_URL = "/api/mcp/presentation-config";
let currentFeed: StudioPresentationFeed | null = null;
let currentSignature = "none:none";
const listeners = new Set<Listener>();
let pollHandle: number | null = null;

function signature(feed: StudioPresentationFeed | null): string {
  return `${feed?.presentationSha256 ?? "none"}:${feed?.renderProfilesSha256 ?? "none"}`;
}

export async function loadStudioPresentationFeed(): Promise<StudioPresentationFeed | null> {
  try {
    const response = await fetch(FEED_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const next = await response.json() as StudioPresentationFeed;
    const nextSignature = signature(next);
    const changed = nextSignature !== currentSignature;
    currentFeed = next;
    currentSignature = nextSignature;
    if (changed) listeners.forEach((listener) => listener(currentFeed));
    return currentFeed;
  } catch {
    return currentFeed;
  }
}

export function getStudioPresentationFeed(): StudioPresentationFeed | null {
  return currentFeed;
}

export function subscribeStudioPresentation(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startStudioPresentationPolling(intervalMs = 3000): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (pollHandle === null) {
    pollHandle = window.setInterval(() => { void loadStudioPresentationFeed(); }, Math.max(1000, intervalMs));
  }
  return () => {
    if (pollHandle !== null) window.clearInterval(pollHandle);
    pollHandle = null;
  };
}

function typeMatches(bindingType: string, entityType: string): boolean {
  return bindingType === "*" ||
    bindingType === entityType ||
    bindingType === `${entityType}_single` ||
    bindingType === `${entityType}_group`;
}

export function resolveStudio3DPresentation(entityId: string, entityType: string): StudioPresentation3D | null {
  const bindings = currentFeed?.presentation?.bindings ?? [];
  const exact = bindings.find((binding) =>
    binding.enabled !== false && binding.targetId === entityId && typeMatches(binding.targetType, entityType)
  );
  const wildcard = bindings.find((binding) =>
    binding.enabled !== false && binding.targetId === "*" && typeMatches(binding.targetType, entityType)
  );
  return exact?.presentation3d ?? wildcard?.presentation3d ??
    currentFeed?.presentation?.fallbacks?.[entityType]?.presentation3d ?? null;
}

export function resolveStudio3DModelUrl(
  entityId: string,
  entityType: string,
  authoritativeModelUrl?: string | null,
): string | undefined {
  const presentation = resolveStudio3DPresentation(entityId, entityType);
  return presentation?.modelUrl?.trim() || authoritativeModelUrl?.trim() || undefined;
}

export function getActiveStudio3DRenderProfile(): { name: string | null; profile: StudioRender3DProfile } {
  const name = currentFeed?.renderProfiles?.active?.client3d ?? null;
  const profile = name ? currentFeed?.renderProfiles?.profiles?.[name]?.client3d ?? {} : {};
  return { name, profile };
}
