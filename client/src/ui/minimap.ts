type EntityPosition = { x: number; z: number };

type MinimapEntity = {
  id: string;
  type: string;
  position: EntityPosition;
  yaw: number;
};

type OverlayMarker = {
  id: string;
  type: "poi" | "resource" | "camp_npc";
  x: number;
  z: number;
  label: string;
  color: string;
  discovered: boolean;
};

type EntityLike = {
  id?: string;
  type?: string;
  position?: { x?: number; z?: number };
  rotation?: { y?: number };
};

type MinimapOptions = {
  size?: number;
  worldHalfExtent?: number;
  refreshHz?: number;
};

const STORAGE_ZOOM_KEY = "areloria:minimap:zoom";
const STORAGE_ROTATION_KEY = "areloria:minimap:rotate";

function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0.6, Math.min(3, value));
}

class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly size: number;
  private readonly worldHalfExtent: number;
  private readonly entities = new Map<string, MinimapEntity>();
  private readonly overlayMarkers = new Map<string, OverlayMarker>();
  private overlayStatusLabel = "waiting";
  private localPlayerId: string | null = null;
  private timer: number | null = null;
  private zoom = 1;
  private rotateWithPlayer = false;
  private localHeadingRad = 0;
  private lastLocalPosition: EntityPosition | null = null;
  private controlsRoot: HTMLDivElement | null = null;
  private visible = true;

  constructor(opts: MinimapOptions = {}) {
    this.size = opts.size ?? 160;
    this.worldHalfExtent = opts.worldHalfExtent ?? 220;
    this.zoom = this.readStoredZoom();
    this.rotateWithPlayer = this.readStoredRotate();

    this.canvas = document.createElement("canvas");
    this.canvas.id = "minimap-canvas";
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "12px";
    this.canvas.style.right = "12px";
    this.canvas.style.width = `${this.size}px`;
    this.canvas.style.height = `${this.size}px`;
    this.canvas.style.borderRadius = "50%";
    this.canvas.style.border = "2px solid rgba(255,215,130,0.72)";
    this.canvas.style.background = "rgba(8,10,16,0.65)";
    this.canvas.style.boxShadow = "0 0 18px rgba(0,0,0,0.6)";
    this.canvas.style.zIndex = "5500";
    this.canvas.style.pointerEvents = "none";
    document.body.appendChild(this.canvas);

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("minimap_canvas_context_unavailable");
    }
    this.ctx = context;
    this.mountControls();

    const hz = Math.max(1, opts.refreshHz ?? 10);
    this.timer = window.setInterval(() => this.draw(), Math.floor(1000 / hz));
    window.addEventListener("keydown", (event) => this.handleHotkeys(event));
  }

  private readStoredZoom(): number {
    try {
      const raw = Number(localStorage.getItem(STORAGE_ZOOM_KEY));
      return clampZoom(raw);
    } catch {
      return 1;
    }
  }

  private readStoredRotate(): boolean {
    try {
      return localStorage.getItem(STORAGE_ROTATION_KEY) === "1";
    } catch {
      return false;
    }
  }

  private persistZoom(): void {
    try {
      localStorage.setItem(STORAGE_ZOOM_KEY, this.zoom.toFixed(2));
    } catch {
      // ignore
    }
  }

  private persistRotate(): void {
    try {
      localStorage.setItem(STORAGE_ROTATION_KEY, this.rotateWithPlayer ? "1" : "0");
    } catch {
      // ignore
    }
  }

  private mountControls(): void {
    const root = document.createElement("div");
    root.id = "minimap-controls";
    root.style.position = "fixed";
    root.style.top = `${12 + this.size + 8}px`;
    root.style.right = "12px";
    root.style.zIndex = "5600";
    root.style.display = "flex";
    root.style.gap = "6px";
    root.style.alignItems = "center";
    root.style.padding = "4px 6px";
    root.style.borderRadius = "10px";
    root.style.background = "rgba(8,10,16,0.72)";
    root.style.border = "1px solid rgba(255,255,255,0.2)";
    root.style.pointerEvents = "auto";

    const buttonStyle = [
      "width:26px",
      "height:24px",
      "border-radius:7px",
      "border:1px solid rgba(255,255,255,0.22)",
      "background:rgba(255,255,255,0.06)",
      "color:#e8ecf5",
      "cursor:pointer",
      "font:600 12px system-ui,sans-serif",
      "padding:0",
      "line-height:1",
    ].join(";");

    root.innerHTML = `
      <button id="minimap-zoom-out" style="${buttonStyle}" title="Zoom out (or -)">−</button>
      <button id="minimap-zoom-in" style="${buttonStyle}" title="Zoom in (or +)">+</button>
      <button id="minimap-rotate" style="${buttonStyle};width:54px" title="Toggle rotation (or M)">ROT</button>
    `;
    document.body.appendChild(root);
    this.controlsRoot = root;

    root.querySelector<HTMLButtonElement>("#minimap-zoom-out")?.addEventListener("click", () => {
      this.adjustZoom(-0.2);
    });
    root.querySelector<HTMLButtonElement>("#minimap-zoom-in")?.addEventListener("click", () => {
      this.adjustZoom(0.2);
    });
    root.querySelector<HTMLButtonElement>("#minimap-rotate")?.addEventListener("click", () => {
      this.toggleRotation();
    });
    this.refreshControls();
  }

  private refreshControls(): void {
    if (!this.controlsRoot) return;
    const rotateBtn = this.controlsRoot.querySelector<HTMLButtonElement>("#minimap-rotate");
    if (rotateBtn) {
      rotateBtn.style.background = this.rotateWithPlayer ? "rgba(88,144,255,0.35)" : "rgba(255,255,255,0.06)";
      rotateBtn.textContent = this.rotateWithPlayer ? "ROT ON" : "ROT OFF";
      rotateBtn.title = `Rotation ${this.rotateWithPlayer ? "enabled" : "disabled"} (M)`;
    }
  }

  private handleHotkeys(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase() ?? "";
    if (tag === "input" || tag === "textarea" || tag === "select") {
      return;
    }
    if (event.key === "m" || event.key === "M") {
      this.toggleRotation();
      return;
    }
    if (event.key === "+" || event.key === "=") {
      this.adjustZoom(0.2);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      this.adjustZoom(-0.2);
    }
  }

  setLocalPlayerId(playerId: string | null): void {
    this.localPlayerId = playerId;
  }

  sync(entities: EntityLike[]): void {
    const next = new Map<string, MinimapEntity>();
    for (const raw of entities) {
      const id = typeof raw.id === "string" ? raw.id : "";
      if (!id) continue;
      const x = Number(raw.position?.x);
      const z = Number(raw.position?.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
      const yaw = Number(raw.rotation?.y);
      next.set(id, {
        id,
        type: typeof raw.type === "string" ? raw.type : "object",
        position: { x, z },
        yaw: Number.isFinite(yaw) ? yaw : 0,
      });
    }
    this.entities.clear();
    for (const [id, entity] of next) {
      this.entities.set(id, entity);
    }
  }

  syncOverlayMarkers(markers: OverlayMarker[], statusLabel: string): void {
    this.overlayMarkers.clear();
    for (const marker of markers) {
      this.overlayMarkers.set(marker.id, marker);
    }
    this.overlayStatusLabel = statusLabel;
  }

  adjustZoom(delta: number): void {
    this.zoom = clampZoom(this.zoom + delta);
    this.persistZoom();
  }

  toggleRotation(): void {
    this.rotateWithPlayer = !this.rotateWithPlayer;
    this.persistRotate();
    this.refreshControls();
  }

  toggleVisibility(): void {
    this.visible = !this.visible;
    const display = this.visible ? "block" : "none";
    this.canvas.style.display = display;
    if (this.controlsRoot) {
      this.controlsRoot.style.display = this.visible ? "flex" : "none";
    }
  }

  private colorForType(type: string): string {
    if (type === "player") return "#5b8def";
    if (type === "npc") return "#3ecf7a";
    if (type === "monster") return "#ff7a7a";
    if (type === "loot") return "#e8c547";
    return "#b9c0cf";
  }

  private projectWorldOffset(dx: number, dz: number, rotationRad: number): [number, number] {
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    const scaledHalfExtent = this.worldHalfExtent / this.zoom;
    const unitsToPixels = (this.size / 2) / scaledHalfExtent;
    return [rx * unitsToPixels, rz * unitsToPixels];
  }

  private updateLocalHeading(local: MinimapEntity | null): void {
    if (!local) {
      this.lastLocalPosition = null;
      return;
    }
    if (!this.lastLocalPosition) {
      this.lastLocalPosition = { ...local.position };
      return;
    }
    const dx = local.position.x - this.lastLocalPosition.x;
    const dz = local.position.z - this.lastLocalPosition.z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq > 0.0004) {
      this.localHeadingRad = Math.atan2(dz, dx);
      this.lastLocalPosition = { ...local.position };
    }
  }

  private draw(): void {
    if (!this.visible) return;

    const ctx = this.ctx;
    const size = this.size;
    const center = size / 2;
    const local = this.localPlayerId ? this.entities.get(this.localPlayerId) ?? null : null;
    this.updateLocalHeading(local);
    const mapRotation = this.rotateWithPlayer ? -this.localHeadingRad + Math.PI / 2 : 0;
    const centerWorld = local ? local.position : { x: 0, z: 0 };

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "rgba(10,12,20,0.82)";
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(55,68,95,0.45)";
    ctx.lineWidth = 0.5;
    const step = size / 8;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Overlay discovery markers (POIs, resources, camp NPCs) — drawn below
    // live entities so presence is always on top of persistent facts.
    for (const marker of this.overlayMarkers.values()) {
      const [ox, oy] = this.projectWorldOffset(
        marker.x - centerWorld.x,
        marker.z - centerWorld.z,
        mapRotation
      );
      const cx = center + ox;
      const cy = center + oy;
      if (cx < -5 || cy < -5 || cx > size + 5 || cy > size + 5) continue;
      if (marker.type === "poi") {
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else if (marker.type === "resource") {
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.fill();
      } else if (marker.type === "camp_npc") {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = marker.color;
        ctx.fill();
      }
    }

    for (const entity of this.entities.values()) {
      if (entity.id === this.localPlayerId) continue;
      const [ox, oy] = this.projectWorldOffset(
        entity.position.x - centerWorld.x,
        entity.position.z - centerWorld.z,
        mapRotation
      );
      const cx = center + ox;
      const cy = center + oy;
      if (cx < -5 || cy < -5 || cx > size + 5 || cy > size + 5) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, entity.type === "loot" ? 2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = this.colorForType(entity.type);
      ctx.fill();
    }

    // Local player marker remains centered.
    ctx.beginPath();
    ctx.arc(center, center, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#5b8def";
    ctx.stroke();

    // Heading pointer.
    const heading = this.rotateWithPlayer ? 0 : this.localHeadingRad - Math.PI / 2;
    const arrowLen = 11;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(heading) * arrowLen, center + Math.sin(heading) * arrowLen);
    ctx.strokeStyle = "rgba(152,202,255,0.92)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}

let minimap: Minimap | null = null;

export function initMinimap(opts?: MinimapOptions): void {
  if (minimap) return;
  minimap = new Minimap(opts);
}

export function setMinimapLocalPlayer(playerId: string | null): void {
  minimap?.setLocalPlayerId(playerId);
}

export function updateMinimapEntities(entities: EntityLike[]): void {
  minimap?.sync(entities);
}

export function updateMinimapOverlayMarkers(markers: OverlayMarker[], statusLabel: string): void {
  minimap?.syncOverlayMarkers(markers, statusLabel);
}

export type { OverlayMarker };

export function adjustMinimapZoom(delta: number): void {
  minimap?.adjustZoom(delta);
}

export function toggleMinimapRotation(): void {
  minimap?.toggleRotation();
}

export function toggleMinimapVisibility(): void {
  minimap?.toggleVisibility();
}