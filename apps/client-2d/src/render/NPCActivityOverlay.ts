/**
 * NPC Activity Overlay - 2D Client Renderer for Server-Authoritative Activity
 * 
 * Renders NPC/Monster activity markers based on npc_activity_snapshot.
 * 
 * Design constraints:
 * - Client renders ONLY from snapshot/Side-Channel
 * - No activity calculation in renderer
 * - Debug/Dev overlay is clearly separated from release-UI
 * - Visibility respects chunk/observer/Liveworld culling
 * 
 * Canonical truth path:
 * server tick / world chunk / npc brain state
 * → deterministic npc activity resolution
 * → npc_activity_snapshot
 * → LiveGameplaySnapshot
 * → 2D marker/status rendering (this module)
 */

import type {
  NPCActivityEntry,
  NPCActivitySnapshotPayload,
  NPCActivityState,
  NPCWorkRole,
} from "../net/protocol";
import { isNPCActivitySnapshotPayload } from "../net/protocol";

// ============================================================================
// Activity Marker Styles
// ============================================================================

interface ActivityMarkerStyle {
  color: string;
  icon: string;
  label: string;
}

/**
 * Activity marker styles - deterministic based on activity type
 * No randomization, no wall-clock timing
 */
const ACTIVITY_STYLES: Record<NPCActivityState, ActivityMarkerStyle> = {
  idle: { color: "#9ca3af", icon: "○", label: "Idle" },
  wandering: { color: "#60a5fa", icon: "→", label: "Wandering" },
  working: { color: "#34d399", icon: "⚒", label: "Working" },
  guarding: { color: "#fbbf24", icon: "🛡", label: "Guarding" },
  fleeing: { color: "#f87171", icon: "!", label: "Fleeing" },
  attacking: { color: "#dc2626", icon: "⚔", label: "Attacking" },
};

/**
 * Work role status text
 */
const WORK_ROLE_LABELS: Record<NPCWorkRole, string> = {
  blacksmith: "Blacksmith",
  farmer: "Farmer",
  merchant: "Merchant",
  guard: "Guard",
  healer: "Healer",
  scholar: "Scholar",
  tavern_keeper: "Tavern Keeper",
  fisherman: "Fisherman",
  woodcutter: "Woodcutter",
  miner: "Miner",
  craftsman: "Craftsman",
  noble: "Noble",
  citizen: "Citizen",
};

// ============================================================================
// Renderer State
// ============================================================================

interface RenderState {
  entries: NPCActivityEntry[];
  lastServerTick: number;
  snapshotHash: string;
  visibleEntries: Set<string>;
}

const state: RenderState = {
  entries: [],
  lastServerTick: 0,
  snapshotHash: "",
  visibleEntries: new Set(),
};

// ============================================================================
// Snapshot Processing
// ============================================================================

/**
 * Process incoming NPC activity snapshot from server
 * Validates and stores snapshot data
 */
export function processNPCActivitySnapshot(data: unknown): boolean {
  if (!isNPCActivitySnapshotPayload(data)) {
    console.warn("[NPCActivityOverlay] Invalid snapshot payload");
    return false;
  }

  // Update state with new snapshot
  state.entries = data.entries;
  state.lastServerTick = data.serverTick;
  state.snapshotHash = data.snapshotHash;

  // Update visible entries set
  state.visibleEntries.clear();
  for (const entry of data.entries) {
    state.visibleEntries.add(entry.entityId);
  }

  return true;
}

/**
 * Get current NPC activity entries
 */
export function getNPCActivityEntries(): readonly NPCActivityEntry[] {
  return state.entries;
}

/**
 * Get entries visible in a specific chunk
 */
export function getEntriesInChunk(chunkKey: string): NPCActivityEntry[] {
  return state.entries.filter(e => e.chunkKey === chunkKey);
}

/**
 * Get entry by entity ID
 */
export function getEntryById(entityId: string): NPCActivityEntry | undefined {
  return state.entries.find(e => e.entityId === entityId);
}

// ============================================================================
// Rendering Utilities
// ============================================================================

/**
 * Get marker style for activity
 */
export function getActivityStyle(activity: NPCActivityState): ActivityMarkerStyle {
  return ACTIVITY_STYLES[activity] ?? ACTIVITY_STYLES.idle;
}

/**
 * Get status text for entry
 */
export function getStatusText(entry: NPCActivityEntry): string {
  // Priority 1: Work role status
  if (entry.workRole) {
    const roleLabel = WORK_ROLE_LABELS[entry.workRole] ?? entry.workRole;
    return `${getActivityStyle(entry.activity).label} - ${roleLabel}`;
  }

  // Priority 2: Activity with status key
  if (entry.statusTextKey) {
    return entry.statusTextKey;
  }

  // Priority 3: Just activity
  return getActivityStyle(entry.activity).label;
}

/**
 * Calculate screen position from world position
 * Uses isometric projection
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  cameraX: number,
  cameraY: number,
  tileSize: number = 32
): { screenX: number; screenY: number } {
  // Simple isometric projection
  const isoX = (worldX - worldY) * (tileSize / 2);
  const isoY = (worldX + worldY) * (tileSize / 4);

  return {
    screenX: isoX - cameraX + window.innerWidth / 2,
    screenY: isoY - cameraY + window.innerHeight / 2,
  };
}

/**
 * Check if entry is visible within view bounds
 */
export function isEntryVisible(
  entry: NPCActivityEntry,
  viewCenterX: number,
  viewCenterY: number,
  viewRadius: number
): boolean {
  const dx = entry.position.x - viewCenterX;
  const dy = entry.position.y - viewCenterY;
  return dx * dx + dy * dy <= viewRadius * viewRadius;
}

/**
 * Filter visible entries based on view
 */
export function getVisibleEntries(
  viewCenterX: number,
  viewCenterY: number,
  viewRadius: number
): NPCActivityEntry[] {
  return state.entries.filter(e =>
    isEntryVisible(e, viewCenterX, viewCenterY, viewRadius)
  );
}

// ============================================================================
// DOM Marker Rendering
// ============================================================================

let markerContainer: HTMLElement | null = null;
let debugOverlay: HTMLElement | null = null;

/**
 * Initialize marker container
 */
function ensureMarkerContainer(): HTMLElement {
  if (markerContainer) return markerContainer;

  markerContainer = document.createElement("div");
  markerContainer.id = "npc-activity-overlay";
  markerContainer.style.cssText = [
    "position: fixed",
    "top: 0",
    "left: 0",
    "width: 100%",
    "height: 100%",
    "pointer-events: none",
    "z-index: 100",
  ].join("; ");

  document.body.appendChild(markerContainer);
  return markerContainer;
}

/**
 * Create marker element for entry
 */
function createMarkerElement(
  entry: NPCActivityEntry,
  screenX: number,
  screenY: number
): HTMLElement {
  const style = getActivityStyle(entry.activity);
  const statusText = getStatusText(entry);

  const marker = document.createElement("div");
  marker.dataset.entityId = entry.entityId;
  marker.dataset.activity = entry.activity;
  marker.style.cssText = [
    `position: absolute`,
    `left: ${screenX}px`,
    `top: ${screenY - 24}px`,
    `transform: translateX(-50%)`,
    `background: ${style.color}`,
    `color: #fff`,
    `padding: 2px 6px`,
    `border-radius: 4px`,
    `font-size: 11px`,
    `font-family: system-ui, sans-serif`,
    `white-space: nowrap`,
    `box-shadow: 0 2px 4px rgba(0,0,0,0.3)`,
    `opacity: 0.85`,
  ].join("; ");

  marker.innerHTML = `<span>${style.icon}</span> ${entry.name}: ${statusText}`;

  return marker;
}

/**
 * Render markers for visible entries
 */
export function renderMarkers(
  cameraX: number,
  cameraY: number,
  viewRadius: number = 500
): void {
  const container = ensureMarkerContainer();

  // Get visible entries
  const visible = getVisibleEntries(cameraX, cameraY, viewRadius);

  // Track rendered markers
  const renderedIds = new Set<string>();

  for (const entry of visible) {
    const { screenX, screenY } = worldToScreen(
      entry.position.x,
      entry.position.y,
      cameraX,
      cameraY
    );

    // Check if marker already exists
    let marker = container.querySelector(`[data-entity-id="${entry.entityId}"]`) as HTMLElement;

    if (marker) {
      // Update existing marker position
      marker.style.left = `${screenX}px`;
      marker.style.top = `${screenY - 24}px`;

      // Update activity color if changed
      const style = getActivityStyle(entry.activity);
      marker.dataset.activity = entry.activity;
      marker.style.background = style.color;
    } else {
      // Create new marker
      marker = createMarkerElement(entry, screenX, screenY);
      container.appendChild(marker);
    }

    renderedIds.add(entry.entityId);
  }

  // Remove markers for entries no longer visible
  const existingMarkers = container.querySelectorAll("[data-entity-id]");
  for (const marker of existingMarkers) {
    const entityId = (marker as HTMLElement).dataset.entityId;
    if (entityId && !renderedIds.has(entityId)) {
      marker.remove();
    }
  }
}

/**
 * Clear all markers
 */
export function clearMarkers(): void {
  if (markerContainer) {
    markerContainer.innerHTML = "";
  }
  state.entries = [];
  state.visibleEntries.clear();
}

// ============================================================================
// Debug Overlay
// ============================================================================

/**
 * Initialize debug overlay (development only)
 */
export function initDebugOverlay(): void {
  if (debugOverlay) return;

  debugOverlay = document.createElement("div");
  debugOverlay.id = "npc-activity-debug-overlay";
  debugOverlay.style.cssText = [
    "position: fixed",
    "top: 10px",
    "right: 10px",
    "background: rgba(0, 0, 0, 0.8)",
    "color: #0f0",
    "padding: 12px",
    "border-radius: 8px",
    "font-family: monospace",
    "font-size: 12px",
    "z-index: 200",
    "max-width: 300px",
    "display: none", // Hidden by default
  ].join("; ");

  document.body.appendChild(debugOverlay);
}

/**
 * Toggle debug overlay visibility
 */
export function toggleDebugOverlay(): void {
  initDebugOverlay();
  if (debugOverlay) {
    debugOverlay.style.display = debugOverlay.style.display === "none" ? "block" : "none";
  }
}

/**
 * Update debug overlay content
 */
export function updateDebugOverlay(): void {
  if (!debugOverlay || debugOverlay.style.display === "none") return;

  const lines: string[] = [
    `=== NPC Activity Debug ===`,
    `Server Tick: ${state.lastServerTick}`,
    `Snapshot Hash: ${state.snapshotHash}`,
    `Total Entries: ${state.entries.length}`,
    ``,
    `Visible Entries:`,
  ];

  for (const entry of state.entries.slice(0, 10)) {
    const style = getActivityStyle(entry.activity);
    lines.push(
      `  ${style.icon} ${entry.name} (${entry.entityId})`
    );
    lines.push(
      `    Activity: ${entry.activity} | Chunk: ${entry.chunkKey}`
    );
    if (entry.workRole) {
      lines.push(`    Role: ${entry.workRole}`);
    }
  }

  if (state.entries.length > 10) {
    lines.push(`  ... and ${state.entries.length - 10} more`);
  }

  debugOverlay.textContent = lines.join("\n");
}

// ============================================================================
// Event Integration
// ============================================================================

/**
 * Listen for NPC activity snapshot events from network
 */
export function initNPNActivityListener(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("wasd:network-packet", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    const record = detail && typeof detail === "object" ? detail as Record<string, unknown> : null;

    if (!record) return;

    // Check for gameplay_event with npc_activity type
    const type = typeof record.type === "string" ? record.type : "";
    const payload = record.payload as Record<string, unknown> | undefined;

    if (type === "gameplay_event" && payload?.eventType === "npc_activity_snapshot") {
      processNPCActivitySnapshot(payload.data);
    }
  }) as EventListener);
}

/**
 * Cleanup on module unload
 */
export function destroyNPNActivityOverlay(): void {
  clearMarkers();

  if (markerContainer) {
    markerContainer.remove();
    markerContainer = null;
  }

  if (debugOverlay) {
    debugOverlay.remove();
    debugOverlay = null;
  }
}

// ============================================================================
// Module Initialization
// ============================================================================

// Auto-initialize when DOM is ready
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initNPNActivityListener();
  }, { once: true });
}

// Export for manual control
export {
  ensureMarkerContainer,
  clearMarkers,
  toggleDebugOverlay,
  updateDebugOverlay,
};