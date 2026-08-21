import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import { liveId, liveName, livePayload, liveSummary, liveX, liveZ, type LiveRealityEntity } from "./liveReality";
import {
  loadAssetManifest,
  pickCharacterVisual,
  type AssetEntry,
  type AssetManifest,
} from "./assetManifest";

const LIVE_SERVER_URL = import.meta.env.VITE_ARELORIA_LIVE_URL || window.location.origin;
const PRESENTATION_URL = "/api/mcp/presentation-config";
const KAPPA_PER_TILE = 1000;
const ALLOW_DEBUG_SHAPES = import.meta.env.VITE_ARELORIA_DEBUG_SHAPES === "true";

type PointKind = "player" | "npc" | "loot";
type Phase = "mounting" | "connecting" | "ready" | "failed";
type PresentationState = "resolved" | "missing" | "debug_shape";

type Presentation2D = {
  kind?: string;
  spriteUrl?: string;
  atlasUrl?: string;
  frame?: string;
  scale?: number;
  anchor?: [number, number];
  shape?: string;
  size?: number;
  color?: string;
  outline?: string;
  assetCategory?: "characters";
  visualId?: string;
  tags?: string[];
  group?: string;
};

type PresentationBinding = {
  bindingId: string;
  targetType: string;
  targetId: string;
  enabled?: boolean;
  presentation2d?: Presentation2D | null;
};

type PresentationFeed = {
  presentationSha256?: string;
  renderProfilesSha256?: string;
  presentation?: {
    bindings?: PresentationBinding[];
    fallbacks?: Record<string, { presentation2d?: Presentation2D }>;
  };
  renderProfiles?: {
    active?: { client2d?: string };
    profiles?: Record<string, { client2d?: Record<string, unknown> }>;
  };
};

type LivePoint = {
  id: string;
  targetId: string;
  name: string;
  x: number;
  z: number;
  kind: PointKind;
};

type ActorVisual = {
  root: Container;
  x: number;
  z: number;
  signature: string;
  presentationState: PresentationState;
  assetId: string | null;
};

type LoadedVisual = {
  sprite: Sprite;
  assetId: string | null;
};

export interface Live2DRuntimeSnapshot {
  phase: Phase;
  connected: boolean;
  rendererStatus: "waiting" | "ready" | "failed";
  playerPos: { x: number; z: number } | null;
  visibleEntities: number;
  resolvedAssetEntities: number;
  missingPresentationEntities: number;
  debugShapeEntities: number;
  serverTick: number | null;
  presentationSha256: string | null;
  renderProfile: string | null;
  assetManifestLoaded: boolean;
  error: string | null;
}

export interface LiveAuthoritativeWorld2DProps {
  onRuntimeSnapshot?: (snapshot: Live2DRuntimeSnapshot) => void;
}

function parseColor(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const normalized = value.trim().replace(/^#/, "");
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toTileCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) > 512 ? value / KAPPA_PER_TILE : value;
}

function isoRelative(x: number, z: number): { x: number; y: number } {
  const tx = toTileCoordinate(x);
  const tz = toTileCoordinate(z);
  return { x: (tx - tz) * 32, y: (tx + tz) * 16 };
}

function point(entity: LiveRealityEntity, kind: PointKind, index: number): LivePoint {
  const targetId = liveId(entity, `${kind}-${index}`);
  return {
    id: `${kind}:${targetId}`,
    targetId,
    name: liveName(entity, kind === "npc" ? "NPC" : kind === "loot" ? "Loot" : "Player"),
    x: liveX(entity),
    z: liveZ(entity),
    kind,
  };
}

function presentationFor(feed: PresentationFeed | null, p: LivePoint): Presentation2D | null {
  const bindings = feed?.presentation?.bindings ?? [];
  const exact = bindings.find((binding) =>
    binding.enabled !== false && binding.targetId === p.targetId &&
    (binding.targetType === p.kind || binding.targetType === `${p.kind}_single` || binding.targetType === "*")
  );
  const wildcard = bindings.find((binding) =>
    binding.enabled !== false && binding.targetId === "*" &&
    (binding.targetType === p.kind || binding.targetType === `${p.kind}_group` || binding.targetType === "*")
  );
  const fallback = feed?.presentation?.fallbacks?.[p.kind]?.presentation2d;
  return exact?.presentation2d ?? wildcard?.presentation2d ?? fallback ?? null;
}

async function loadPresentationFeed(): Promise<PresentationFeed | null> {
  try {
    const response = await fetch(PRESENTATION_URL, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json() as PresentationFeed;
  } catch {
    return null;
  }
}

function feedSignature(feed: PresentationFeed | null): string {
  return `${feed?.presentationSha256 ?? "none"}:${feed?.renderProfilesSha256 ?? "none"}`;
}

function profileSettings(feed: PresentationFeed | null): { name: string | null; settings: Record<string, unknown> } {
  const name = feed?.renderProfiles?.active?.client2d ?? null;
  const settings = name ? feed?.renderProfiles?.profiles?.[name]?.client2d ?? {} : {};
  return { name, settings };
}

function cropTexture(texture: Texture, entry: AssetEntry): Texture {
  if (entry.frame) {
    return new Texture({
      source: texture.source,
      frame: new Rectangle(entry.frame.x, entry.frame.y, entry.frame.w, entry.frame.h),
    });
  }

  if (entry.sheetFrame && entry.frameSize) {
    const frameWidth = Math.max(1, Number(entry.frameSize.w));
    const frameHeight = Math.max(1, Number(entry.frameSize.h));
    const columns = Math.max(1, Math.floor(Number(entry.sheetFrame.w) / frameWidth));
    const idleColumn = Math.min(columns - 1, Math.floor(columns / 2));
    return new Texture({
      source: texture.source,
      frame: new Rectangle(
        Number(entry.sheetFrame.x) + idleColumn * frameWidth,
        Number(entry.sheetFrame.y),
        frameWidth,
        frameHeight,
      ),
    });
  }

  return texture;
}

export function LiveAuthoritativeWorld2D({ onRuntimeSnapshot }: LiveAuthoritativeWorld2DProps = {}) {
  const host = useRef<HTMLDivElement>(null);
  const app = useRef<Application | null>(null);
  const world = useRef<Container | null>(null);
  const actors = useRef<Map<string, ActorVisual>>(new Map());
  const feed = useRef<PresentationFeed | null>(null);
  const assetManifest = useRef<AssetManifest | null>(null);
  const feedSig = useRef("none:none");
  const connected = useRef(false);
  const serverTick = useRef<number | null>(null);
  const playerPos = useRef<{ x: number; z: number } | null>(null);
  const lastError = useRef<string | null>(null);
  const phase = useRef<Phase>("mounting");

  const emit = (visibleEntities = actors.current.size): void => {
    const profile = profileSettings(feed.current);
    const actorValues = [...actors.current.values()];
    onRuntimeSnapshot?.({
      phase: phase.current,
      connected: connected.current,
      rendererStatus: phase.current === "ready" ? "ready" : phase.current === "failed" ? "failed" : "waiting",
      playerPos: playerPos.current,
      visibleEntities,
      resolvedAssetEntities: actorValues.filter((actor) => actor.presentationState === "resolved").length,
      missingPresentationEntities: actorValues.filter((actor) => actor.presentationState === "missing").length,
      debugShapeEntities: actorValues.filter((actor) => actor.presentationState === "debug_shape").length,
      serverTick: serverTick.current,
      presentationSha256: feed.current?.presentationSha256 ?? null,
      renderProfile: profile.name,
      assetManifestLoaded: Boolean(assetManifest.current),
      error: lastError.current,
    });
  };

  const clearActors = (): void => {
    actors.current.forEach((actor) => actor.root.destroy({ children: true }));
    actors.current.clear();
  };

  const createDebugShape = (presentation: Presentation2D, kind: PointKind): Graphics => {
    const defaults = kind === "player" ? 0x4488ff : kind === "npc" ? 0x00aa55 : 0xffc14d;
    const size = Math.max(8, Number(presentation.size ?? 28));
    const graphic = new Graphics();
    if (presentation.shape === "circle") graphic.circle(0, -size / 2, size / 2);
    else graphic.roundRect(-size / 2, -size, size, size, Math.max(2, size * 0.16));
    graphic.fill(parseColor(presentation.color, defaults));
    graphic.stroke({ width: 2, color: parseColor(presentation.outline, 0xffffff), alpha: 0.8 });
    return graphic;
  };

  const createMissingPresentationMarker = (kind: PointKind): Container => {
    const marker = new Container();
    const graphic = new Graphics();
    graphic.moveTo(-10, -24).lineTo(10, -4);
    graphic.moveTo(10, -24).lineTo(-10, -4);
    graphic.stroke({ width: 3, color: 0xff3b7a, alpha: 0.95 });
    marker.addChild(graphic);

    const status = new Text({
      text: `presentation unavailable: ${kind}`,
      style: { fontSize: 9, fill: 0xff8fb3, stroke: { color: 0x02030a, width: 2 }, fontFamily: "monospace" },
    });
    status.anchor.set(0.5, 0);
    status.y = 2;
    marker.addChild(status);
    return marker;
  };

  const loadAssetEntrySprite = async (entry: AssetEntry, presentation: Presentation2D): Promise<Sprite | null> => {
    if (!entry.src) return null;
    try {
      const baseTexture = await Assets.load<Texture>(entry.src);
      const sprite = new Sprite(cropTexture(baseTexture, entry));
      const anchor = presentation.anchor ?? [0.5, 1];
      sprite.anchor.set(Number(anchor[0] ?? 0.5), Number(anchor[1] ?? 1));
      sprite.scale.set(Number(presentation.scale ?? 1));
      return sprite;
    } catch (error) {
      console.warn("[2D Live] asset-manifest sprite load failed", entry.id ?? entry.src, error);
      return null;
    }
  };

  const loadSprite = async (presentation: Presentation2D, p: LivePoint): Promise<LoadedVisual | null> => {
    try {
      if (presentation.kind === "asset_manifest") {
        if (presentation.assetCategory !== "characters" || !assetManifest.current) return null;
        const selected = pickCharacterVisual(assetManifest.current, {
          visualId: presentation.visualId ?? null,
          tags: presentation.tags ?? [],
          group: presentation.group ?? null,
          kind: "character",
          seed: p.targetId,
        });
        if (!selected) return null;
        const sprite = await loadAssetEntrySprite(selected.entry, presentation);
        return sprite ? { sprite, assetId: selected.id } : null;
      }

      let texture: Texture | null = null;
      if (presentation.atlasUrl && presentation.frame) {
        const sheet: any = await Assets.load(presentation.atlasUrl);
        texture = sheet?.textures?.[presentation.frame] ?? null;
      } else if (presentation.spriteUrl) {
        texture = await Assets.load<Texture>(presentation.spriteUrl);
      }
      if (!texture) return null;
      const sprite = new Sprite(texture);
      const anchor = presentation.anchor ?? [0.5, 1];
      sprite.anchor.set(Number(anchor[0] ?? 0.5), Number(anchor[1] ?? 1));
      sprite.scale.set(Number(presentation.scale ?? 1));
      return { sprite, assetId: presentation.spriteUrl ?? presentation.frame ?? null };
    } catch (error) {
      console.warn("[2D Live] configured sprite load failed", error);
      return null;
    }
  };

  const ensureActor = async (p: LivePoint): Promise<ActorVisual | null> => {
    const layer = world.current;
    if (!layer) return null;
    const presentation = presentationFor(feed.current, p);
    const signature = JSON.stringify(presentation);
    const existing = actors.current.get(p.id);
    if (existing && existing.signature === signature) return existing;
    if (existing) {
      existing.root.destroy({ children: true });
      actors.current.delete(p.id);
    }

    const root = new Container();
    root.label = p.id;
    const label = new Text({
      text: p.name,
      style: { fontSize: 11, fill: 0xffffff, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" },
    });
    label.anchor.set(0.5, 1);
    label.y = -38;
    root.addChild(label);
    layer.addChild(root);

    const actor: ActorVisual = {
      root,
      x: p.x,
      z: p.z,
      signature,
      presentationState: "missing",
      assetId: null,
    };
    actors.current.set(p.id, actor);

    if (presentation?.kind === "shape" && ALLOW_DEBUG_SHAPES) {
      root.addChildAt(createDebugShape(presentation, p.kind), 0);
      actor.presentationState = "debug_shape";
      return actor;
    }

    if (presentation) {
      const loaded = await loadSprite(presentation, p);
      if (loaded && actors.current.get(p.id) === actor) {
        root.addChildAt(loaded.sprite, 0);
        actor.presentationState = "resolved";
        actor.assetId = loaded.assetId;
        root.label = loaded.assetId ? `${p.id}|asset:${loaded.assetId}` : p.id;
        return actor;
      }
    }

    if (actors.current.get(p.id) === actor) {
      root.addChildAt(createMissingPresentationMarker(p.kind), 0);
      actor.presentationState = "missing";
    }
    return actor;
  };

  const placeActors = async (points: LivePoint[]): Promise<void> => {
    const pixi = app.current;
    const layer = world.current;
    if (!pixi || !layer) return;
    const ids = new Set(points.map((p) => p.id));
    actors.current.forEach((actor, id) => {
      if (!ids.has(id)) {
        actor.root.destroy({ children: true });
        actors.current.delete(id);
      }
    });

    const focus = points.find((p) => p.kind === "player") ?? points[0] ?? null;
    if (focus) playerPos.current = { x: focus.x, z: focus.z };
    const focusIso = focus ? isoRelative(focus.x, focus.z) : { x: 0, y: 0 };
    layer.x = pixi.screen.width / 2 - focusIso.x;
    layer.y = pixi.screen.height / 2 - focusIso.y;

    for (const p of points) {
      const actor = await ensureActor(p);
      if (!actor) continue;
      actor.x = p.x;
      actor.z = p.z;
      const pos = isoRelative(p.x, p.z);
      actor.root.x = pos.x;
      actor.root.y = pos.y;
      actor.root.zIndex = Math.round(pos.y);
    }
    emit(points.length);
  };

  useEffect(() => {
    if (!host.current || app.current) return;
    let cancelled = false;
    let presentationPoll: number | null = null;
    const client = createClient({ url: LIVE_SERVER_URL, heartbeatInterval: 30000 });

    const boot = async (): Promise<void> => {
      try {
        phase.current = "connecting";
        const [presentationFeed, manifest] = await Promise.all([
          loadPresentationFeed(),
          loadAssetManifest(),
        ]);
        feed.current = presentationFeed;
        assetManifest.current = manifest;
        feedSig.current = feedSignature(feed.current);

        if (!presentationFeed) {
          lastError.current = "presentation_config_unavailable";
        } else if (!manifest) {
          lastError.current = "asset_manifest_unavailable";
        }

        const { settings } = profileSettings(feed.current);
        const resolutionScale = Math.max(0.5, Math.min(2, Number(settings.resolutionScale ?? 1)));
        const pixi = new Application();
        app.current = pixi;
        await pixi.init({
          background: 0x0a1018,
          resizeTo: host.current!,
          antialias: settings.antialias !== false,
          autoDensity: true,
          resolution: Math.min((window.devicePixelRatio || 1) * resolutionScale, 3),
        });
        if (cancelled) return;
        const maxFps = Math.max(15, Math.min(240, Number(settings.maxFps ?? 60)));
        pixi.ticker.maxFPS = maxFps;
        host.current?.appendChild(pixi.canvas);
        const root = new Container();
        root.sortableChildren = true;
        world.current = root;
        pixi.stage.addChild(root);

        client.on("connect" as any, () => {
          connected.current = true;
          phase.current = "ready";
          emit();
        });
        client.on("disconnect" as any, () => {
          connected.current = false;
          emit();
        });
        const ingest = (event: any): void => {
          const payload = livePayload(event);
          const summary = liveSummary(payload);
          const points = [
            ...summary.players.map((entry, index) => point(entry, "player", index)),
            ...summary.npcs.map((entry, index) => point(entry, "npc", index)),
            ...summary.loot.map((entry, index) => point(entry, "loot", index)),
          ].slice(0, 400);
          const tick = Number(payload.tick ?? payload.serverTick);
          serverTick.current = Number.isFinite(tick) ? tick : serverTick.current;
          void placeActors(points);
        };
        client.on("WORLD_HEARTBEAT" as any, ingest);
        client.on("world_tick" as any, ingest);
        client.on("WORLD_TICK" as any, ingest);
        client.connect();

        presentationPoll = window.setInterval(async () => {
          const next = await loadPresentationFeed();
          const nextSig = feedSignature(next);
          if (next && nextSig !== feedSig.current) {
            feed.current = next;
            feedSig.current = nextSig;
            lastError.current = null;
            const { settings: nextSettings } = profileSettings(next);
            pixi.ticker.maxFPS = Math.max(15, Math.min(240, Number(nextSettings.maxFps ?? 60)));
            clearActors();
            emit(0);
          }
        }, 3000);
      } catch (error) {
        lastError.current = error instanceof Error ? error.message : String(error);
        phase.current = "failed";
        emit();
      }
    };

    void boot();
    return () => {
      cancelled = true;
      if (presentationPoll !== null) window.clearInterval(presentationPoll);
      client.disconnect();
      clearActors();
      app.current?.destroy(true);
      app.current = null;
      world.current = null;
      assetManifest.current = null;
    };
  }, []);

  return <div ref={host} data-testid="live-authoritative-world-2d" style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}