type EntityPosition = { x: number; z: number };

type MinimapEntity = {
  id: string;
  type: string;
  position: EntityPosition;
};

type EntityLike = {
  id?: string;
  type?: string;
  position?: { x?: number; z?: number };
};

type MinimapOptions = {
  size?: number;
  worldHalfExtent?: number;
  refreshHz?: number;
};

class Minimap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly size: number;
  private readonly worldHalfExtent: number;
  private readonly entities = new Map<string, MinimapEntity>();
  private localPlayerId: string | null = null;
  private timer: number | null = null;

  constructor(opts: MinimapOptions = {}) {
    this.size = opts.size ?? 160;
    this.worldHalfExtent = opts.worldHalfExtent ?? 220;
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

    const hz = Math.max(1, opts.refreshHz ?? 10);
    this.timer = window.setInterval(() => this.draw(), Math.floor(1000 / hz));
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
      next.set(id, {
        id,
        type: typeof raw.type === "string" ? raw.type : "object",
        position: { x, z },
      });
    }
    this.entities.clear();
    for (const [id, entity] of next) {
      this.entities.set(id, entity);
    }
  }

  private worldToCanvas(x: number, z: number): [number, number] {
    const span = this.worldHalfExtent * 2;
    const nx = (x + this.worldHalfExtent) / span;
    const nz = (z + this.worldHalfExtent) / span;
    return [
      Math.max(0, Math.min(this.size, nx * this.size)),
      Math.max(0, Math.min(this.size, nz * this.size)),
    ];
  }

  private colorForType(type: string): string {
    if (type === "player") return "#5b8def";
    if (type === "npc") return "#3ecf7a";
    if (type === "monster") return "#ff7a7a";
    if (type === "loot") return "#e8c547";
    return "#b9c0cf";
  }

  private draw(): void {
    const ctx = this.ctx;
    const size = this.size;
    const center = size / 2;

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

    for (const entity of this.entities.values()) {
      if (entity.id === this.localPlayerId) continue;
      const [cx, cy] = this.worldToCanvas(entity.position.x, entity.position.z);
      ctx.beginPath();
      ctx.arc(cx, cy, entity.type === "loot" ? 2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = this.colorForType(entity.type);
      ctx.fill();
    }

    if (this.localPlayerId) {
      const me = this.entities.get(this.localPlayerId);
      if (me) {
        const [cx, cy] = this.worldToCanvas(me.position.x, me.position.z);
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#5b8def";
        ctx.stroke();
      }
    }

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