import * as React from "react";

import {
  ARE_SIMULATION_TICK_HZ,
  ARE_SIMULATION_TICK_MS,
} from "@wasd/shared";

/**
 * Deterministic viewport state for the browser client.
 *
 * Why this is stricter than a normal resize hook:
 * - no Date.now(), no performance.now(), no random input
 * - one global store instead of one listener per component
 * - browser resize/orientation noise is coalesced to the ARE/world-server cadence
 * - all derived values are pure functions of the current viewport snapshot
 *
 * This does NOT make viewport size part of authoritative game simulation.
 * The server remains authoritative. This hook is only for HUD/layout decisions.
 */
export const WORLD_SERVER_TICK_HZ = ARE_SIMULATION_TICK_HZ;
export const WORLD_SERVER_TICK_MS = ARE_SIMULATION_TICK_MS;

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;
export const DESKTOP_BREAKPOINT = 1280;

export type ViewportMode = "mobile" | "tablet" | "desktop" | "wide";
export type ViewportOrientation = "portrait" | "landscape" | "square";

export interface ViewportSnapshot {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number;
  readonly mode: ViewportMode;
  readonly orientation: ViewportOrientation;
  readonly isMobile: boolean;
  readonly isTablet: boolean;
  readonly isDesktop: boolean;
  readonly isWide: boolean;
  /** Monotonic event counter. Never wall-clock time. */
  readonly revision: number;
  /** Explicitly documents the layout coalescing cadence. */
  readonly tickHz: typeof WORLD_SERVER_TICK_HZ;
  readonly tickMs: typeof WORLD_SERVER_TICK_MS;
}

type ViewportListener = () => void;

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

const HAS_BROWSER = typeof window !== "undefined";

function clampNonNegativeInteger(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function quantizeDevicePixelRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.max(1, Math.round(value * 100) / 100);
}

export function classifyViewportMode(width: number): ViewportMode {
  const safeWidth = clampNonNegativeInteger(width);

  if (safeWidth < MOBILE_BREAKPOINT) return "mobile";
  if (safeWidth < TABLET_BREAKPOINT) return "tablet";
  if (safeWidth < DESKTOP_BREAKPOINT) return "desktop";
  return "wide";
}

export function classifyViewportOrientation(width: number, height: number): ViewportOrientation {
  const safeWidth = clampNonNegativeInteger(width);
  const safeHeight = clampNonNegativeInteger(height);

  if (safeWidth === safeHeight) return "square";
  return safeWidth > safeHeight ? "landscape" : "portrait";
}

function createSnapshot(width: number, height: number, devicePixelRatio: number, revision: number): ViewportSnapshot {
  const safeWidth = clampNonNegativeInteger(width);
  const safeHeight = clampNonNegativeInteger(height);
  const mode = classifyViewportMode(safeWidth);

  return Object.freeze({
    width: safeWidth,
    height: safeHeight,
    devicePixelRatio: quantizeDevicePixelRatio(devicePixelRatio),
    mode,
    orientation: classifyViewportOrientation(safeWidth, safeHeight),
    isMobile: mode === "mobile",
    isTablet: mode === "tablet",
    isDesktop: mode === "desktop",
    isWide: mode === "wide",
    revision,
    tickHz: WORLD_SERVER_TICK_HZ,
    tickMs: WORLD_SERVER_TICK_MS,
  });
}

const SERVER_SNAPSHOT: ViewportSnapshot = createSnapshot(
  DESKTOP_BREAKPOINT,
  MOBILE_BREAKPOINT,
  1,
  0,
);

let currentSnapshot = SERVER_SNAPSHOT;
let pendingTick = false;
let pendingTimer: ReturnType<typeof window.setTimeout> | undefined;
let stopBrowserListeners: (() => void) | undefined;

const listeners = new Set<ViewportListener>();

function readBrowserSnapshot(revision: number): ViewportSnapshot {
  if (!HAS_BROWSER) return SERVER_SNAPSHOT;

  return createSnapshot(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio,
    revision,
  );
}

function snapshotsRepresentSameViewport(a: ViewportSnapshot, b: ViewportSnapshot): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.devicePixelRatio === b.devicePixelRatio &&
    a.mode === b.mode &&
    a.orientation === b.orientation
  );
}

function publishViewportSnapshot(): void {
  const nextSnapshot = readBrowserSnapshot(currentSnapshot.revision + 1);

  if (snapshotsRepresentSameViewport(currentSnapshot, nextSnapshot)) return;

  currentSnapshot = nextSnapshot;
  for (const listener of listeners) listener();
}

function scheduleViewportTick(): void {
  if (!HAS_BROWSER || pendingTick) return;

  pendingTick = true;
  pendingTimer = window.setTimeout(() => {
    pendingTick = false;
    pendingTimer = undefined;
    publishViewportSnapshot();
  }, WORLD_SERVER_TICK_MS);
}

function addMediaQueryListener(mql: LegacyMediaQueryList, listener: (event: MediaQueryListEvent) => void): () => void {
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }

  mql.addListener?.(listener);
  return () => mql.removeListener?.(listener);
}

function startViewportStore(): () => void {
  if (!HAS_BROWSER) return () => undefined;
  if (stopBrowserListeners) return stopBrowserListeners;

  // Hydrate once synchronously to prevent the first client render from lying.
  publishViewportSnapshot();

  const onViewportSignal = () => scheduleViewportTick();
  const mediaQueries: LegacyMediaQueryList[] = [
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`),
    window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`),
    window.matchMedia(`(min-width: ${TABLET_BREAKPOINT}px) and (max-width: ${DESKTOP_BREAKPOINT - 1}px)`),
    window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`),
  ];

  window.addEventListener("resize", onViewportSignal, { passive: true });
  window.addEventListener("orientationchange", onViewportSignal, { passive: true });
  window.visualViewport?.addEventListener("resize", onViewportSignal, { passive: true });

  const removeMediaQueryListeners = mediaQueries.map((mql) => addMediaQueryListener(mql, onViewportSignal));

  stopBrowserListeners = () => {
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer);
      pendingTimer = undefined;
    }

    pendingTick = false;
    window.removeEventListener("resize", onViewportSignal);
    window.removeEventListener("orientationchange", onViewportSignal);
    window.visualViewport?.removeEventListener("resize", onViewportSignal);
    for (const remove of removeMediaQueryListeners) remove();
    stopBrowserListeners = undefined;
  };

  return stopBrowserListeners;
}

function subscribeViewport(listener: ViewportListener): () => void {
  listeners.add(listener);
  const stop = startViewportStore();

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stop();
    }
  };
}

export function getViewportSnapshot(): ViewportSnapshot {
  return currentSnapshot;
}

export function useViewportSnapshot(): ViewportSnapshot {
  return React.useSyncExternalStore(
    subscribeViewport,
    getViewportSnapshot,
    () => SERVER_SNAPSHOT,
  );
}

export function useViewportMode(): ViewportMode {
  return useViewportSnapshot().mode;
}

export function useIsMobile(): boolean {
  return useViewportSnapshot().isMobile;
}

export function useIsTablet(): boolean {
  return useViewportSnapshot().isTablet;
}

export function useIsDesktop(): boolean {
  const snapshot = useViewportSnapshot();
  return snapshot.isDesktop || snapshot.isWide;
}

export function useIsTabletOrMobile(): boolean {
  const snapshot = useViewportSnapshot();
  return snapshot.isMobile || snapshot.isTablet;
}
