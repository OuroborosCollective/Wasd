import type { NPCActivityEntry, NPCActivitySnapshotPayload, NPCActivityState, NPCWorkRole } from "../net/protocol";
import { isNPCActivitySnapshotPayload } from "../net/protocol";

interface ActivityMarkerStyle {
  color: string;
  icon: string;
  label: string;
}

const ACTIVITY_STYLES: Record<NPCActivityState, ActivityMarkerStyle> = {
  idle: { color: "#9ca3af", icon: "○", label: "Idle" },
  wandering: { color: "#60a5fa", icon: "→", label: "Wandering" },
  working: { color: "#34d399", icon: "⚒", label: "Working" },
  guarding: { color: "#fbbf24", icon: "🛡", label: "Guarding" },
  fleeing: { color: "#f87171", icon: "!", label: "Fleeing" },
  attacking: { color: "#dc2626", icon: "⚔", label: "Attacking" },
};

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

let markerContainer: HTMLElement | null = null;
let debugOverlay: HTMLElement | null = null;

export function processNPCActivitySnapshot(data: unknown): boolean {
  if (!isNPCActivitySnapshotPayload(data)) {
    console.warn("[NPCActivityOverlay] Invalid snapshot payload");
    return false;
  }
  state.entries = data.entries;
  state.lastServerTick = data.serverTick;
  state.snapshotHash = data.snapshotHash;
  state.visibleEntries.clear();
  for (const entry of data.entries) state.visibleEntries.add(entry.entityId);
  return true;
}

export function getNPCActivityEntries(): readonly NPCActivityEntry[] {
  return state.entries;
}

export function getEntriesInChunk(chunkKey: string): NPCActivityEntry[] {
  return state.entries.filter((entry) => entry.chunkKey === chunkKey);
}

export function getEntryById(entityId: string): NPCActivityEntry | undefined {
  return state.entries.find((entry) => entry.entityId === entityId);
}

export function getActivityStyle(activity: NPCActivityState): ActivityMarkerStyle {
  return ACTIVITY_STYLES[activity] ?? ACTIVITY_STYLES.idle;
}

export function getStatusText(entry: NPCActivityEntry): string {
  if (entry.workRole) return `${getActivityStyle(entry.activity).label} - ${WORK_ROLE_LABELS[entry.workRole] ?? entry.workRole}`;
  if (entry.statusTextKey) return entry.statusTextKey;
  return getActivityStyle(entry.activity).label;
}

export function worldToScreen(worldX: number, worldY: number, cameraX: number, cameraY: number, tileSize = 32): { screenX: number; screenY: number } {
  const isoX = (worldX - worldY) * (tileSize / 2);
  const isoY = (worldX + worldY) * (tileSize / 4);
  const width = typeof window !== "undefined" ? window.innerWidth : 0;
  const height = typeof window !== "undefined" ? window.innerHeight : 0;
  return { screenX: isoX - cameraX + width / 2, screenY: isoY - cameraY + height / 2 };
}

export function isEntryVisible(entry: NPCActivityEntry, viewCenterX: number, viewCenterY: number, viewRadius: number): boolean {
  const dx = entry.position.x - viewCenterX;
  const dy = entry.position.y - viewCenterY;
  return dx * dx + dy * dy <= viewRadius * viewRadius;
}

export function getVisibleEntries(viewCenterX: number, viewCenterY: number, viewRadius: number): NPCActivityEntry[] {
  return state.entries.filter((entry) => isEntryVisible(entry, viewCenterX, viewCenterY, viewRadius));
}

function ensureMarkerContainer(): HTMLElement {
  if (markerContainer) return markerContainer;
  markerContainer = document.createElement("div");
  markerContainer.id = "npc-activity-overlay";
  markerContainer.style.cssText = ["position: fixed", "top: 0", "left: 0", "width: 100%", "height: 100%", "pointer-events: none", "z-index: 100"].join("; ");
  document.body.appendChild(markerContainer);
  return markerContainer;
}

function setMarkerText(marker: HTMLElement, entry: NPCActivityEntry): void {
  const style = getActivityStyle(entry.activity);
  const icon = document.createElement("span");
  icon.textContent = style.icon;
  marker.replaceChildren(icon, document.createTextNode(` ${entry.name}: ${getStatusText(entry)}`));
}

function createMarkerElement(entry: NPCActivityEntry, screenX: number, screenY: number): HTMLElement {
  const style = getActivityStyle(entry.activity);
  const marker = document.createElement("div");
  marker.dataset.entityId = entry.entityId;
  marker.dataset.activity = entry.activity;
  marker.style.cssText = [`position: absolute`, `left: ${screenX}px`, `top: ${screenY - 24}px`, `transform: translateX(-50%)`, `background: ${style.color}`, `color: #fff`, `padding: 2px 6px`, `border-radius: 4px`, `font-size: 11px`, `font-family: system-ui, sans-serif`, `white-space: nowrap`, `box-shadow: 0 2px 4px rgba(0,0,0,0.3)`, `opacity: 0.85`].join("; ");
  setMarkerText(marker, entry);
  return marker;
}

export function renderMarkers(cameraX: number, cameraY: number, viewRadius = 500): void {
  const container = ensureMarkerContainer();
  const visible = getVisibleEntries(cameraX, cameraY, viewRadius);
  const renderedIds = new Set<string>();
  for (const entry of visible) {
    const { screenX, screenY } = worldToScreen(entry.position.x, entry.position.y, cameraX, cameraY);
    let marker = container.querySelector(`[data-entity-id="${entry.entityId}"]`) as HTMLElement | null;
    const style = getActivityStyle(entry.activity);
    if (marker) {
      marker.style.left = `${screenX}px`;
      marker.style.top = `${screenY - 24}px`;
      marker.dataset.activity = entry.activity;
      marker.style.background = style.color;
      setMarkerText(marker, entry);
    } else {
      marker = createMarkerElement(entry, screenX, screenY);
      container.appendChild(marker);
    }
    renderedIds.add(entry.entityId);
  }
  const existingMarkers = container.querySelectorAll("[data-entity-id]");
  for (const marker of existingMarkers) {
    const entityId = (marker as HTMLElement).dataset.entityId;
    if (entityId && !renderedIds.has(entityId)) marker.remove();
  }
}

export function clearMarkers(): void {
  if (markerContainer) markerContainer.replaceChildren();
  state.entries = [];
  state.visibleEntries.clear();
}

export function initDebugOverlay(): void {
  if (debugOverlay) return;
  debugOverlay = document.createElement("div");
  debugOverlay.id = "npc-activity-debug-overlay";
  debugOverlay.style.cssText = ["position: fixed", "top: 10px", "right: 10px", "background: rgba(0, 0, 0, 0.8)", "color: #0f0", "padding: 12px", "border-radius: 8px", "font-family: monospace", "font-size: 12px", "z-index: 200", "max-width: 300px", "display: none"].join("; ");
  document.body.appendChild(debugOverlay);
}

export function toggleDebugOverlay(): void {
  initDebugOverlay();
  if (debugOverlay) debugOverlay.style.display = debugOverlay.style.display === "none" ? "block" : "none";
}

export function updateDebugOverlay(): void {
  if (!debugOverlay || debugOverlay.style.display === "none") return;
  const lines = [`=== NPC Activity Debug ===`, `Server Tick: ${state.lastServerTick}`, `Snapshot Hash: ${state.snapshotHash}`, `Total Entries: ${state.entries.length}`, ``, `Visible Entries:`];
  for (const entry of state.entries.slice(0, 10)) {
    const style = getActivityStyle(entry.activity);
    lines.push(`  ${style.icon} ${entry.name} (${entry.entityId})`);
    lines.push(`    Activity: ${entry.activity} | Chunk: ${entry.chunkKey}`);
    if (entry.workRole) lines.push(`    Role: ${entry.workRole}`);
  }
  if (state.entries.length > 10) lines.push(`  ... and ${state.entries.length - 10} more`);
  debugOverlay.textContent = lines.join("\n");
}

export function initNPNActivityListener(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("wasd:network-packet", ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    const record = detail && typeof detail === "object" ? detail as Record<string, unknown> : null;
    if (!record) return;
    const eventName = typeof record.event === "string" ? record.event : typeof record.type === "string" ? record.type : "";
    const payload = record.payload as Record<string, unknown> | undefined;
    if (eventName === "gameplay_event" && payload?.eventType === "npc_activity_snapshot") processNPCActivitySnapshot(payload.data);
  }) as EventListener);
}

export function destroyNPNActivityOverlay(): void {
  clearMarkers();
  markerContainer?.remove();
  markerContainer = null;
  debugOverlay?.remove();
  debugOverlay = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => initNPNActivityListener(), { once: true });
}

export { ensureMarkerContainer };
