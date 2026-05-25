import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";

type WorldHeartStatus = "STABLE" | "WATCH" | "CRITICAL" | "DECOMPOSITION";

type WorldHeartSnapshot = {
  divergence: number;
  entropy: number;
  stability: number;
  npcCritical: number;
  npcDecomposition: number;
  status: WorldHeartStatus;
};

const DEFAULT_SNAPSHOT: WorldHeartSnapshot = {
  divergence: 0,
  entropy: 0,
  stability: 1,
  npcCritical: 0,
  npcDecomposition: 0,
  status: "STABLE",
};

function statusColor(status: WorldHeartStatus): number {
  switch (status) {
    case "DECOMPOSITION": return 0x9900ff;
    case "CRITICAL": return 0xff3300;
    case "WATCH": return 0xffcc00;
    case "STABLE":
    default: return 0x00ff99;
  }
}

class WorldHeartPixi extends Container {
  private readonly core = new Graphics();
  private readonly label = new Text({ text: "ARELORIA HEART", style: { fontFamily: "monospace", fontSize: 12, fill: 0xffffff } });
  private readonly metrics = new Text({ text: "status: STABLE", style: { fontFamily: "monospace", fontSize: 10, fill: 0xffffff } });
  private pulse = 0;
  private snapshot: WorldHeartSnapshot = DEFAULT_SNAPSHOT;

  constructor() {
    super();
    this.label.anchor.set(0.5);
    this.metrics.anchor.set(0.5);
    this.label.y = 58;
    this.metrics.y = 76;
    this.addChild(this.core, this.label, this.metrics);
  }

  setSnapshot(snapshot: Partial<WorldHeartSnapshot>) {
    this.snapshot = { ...DEFAULT_SNAPSHOT, ...snapshot };
  }

  update(delta: number) {
    const divergence = Number(this.snapshot.divergence || 0);
    const stability = Math.max(0, Math.min(1, Number(this.snapshot.stability ?? 1)));
    const instability = 1 - stability;
    this.pulse += 0.05 * delta + divergence * 20;
    const radius = 34 + Math.sin(this.pulse) * (3 + instability * 13);
    const color = statusColor(this.snapshot.status);

    this.core.clear();
    this.core.circle(0, 0, radius + 14).fill({ color, alpha: 0.16 });
    this.core.circle(0, 0, radius).fill({ color, alpha: 0.82 });
    this.core.circle(0, 0, radius + 7).stroke({ width: 2, color: 0xffffff, alpha: 0.28 });

    this.metrics.text = `status: ${this.snapshot.status}\ndiv: ${divergence.toFixed(5)} ent: ${Number(this.snapshot.entropy || 0).toFixed(3)}\ncrit: ${this.snapshot.npcCritical || 0} deco: ${this.snapshot.npcDecomposition || 0}`;
  }
}

export function WorldHeartMonitor() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!hostRef.current || appRef.current) return;

    const app = new Application();
    appRef.current = app;
    let interval: number | undefined;
    let destroyed = false;

    app.init({ backgroundAlpha: 0, width: 210, height: 150, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) }).then(() => {
      if (destroyed || !hostRef.current) {
        app.destroy(true);
        return;
      }

      hostRef.current.appendChild(app.canvas);
      const heart = new WorldHeartPixi();
      heart.x = 105;
      heart.y = 48;
      app.stage.addChild(heart);
      app.ticker.add((ticker) => heart.update(ticker.deltaTime));

      const fetchSnapshot = async () => {
        try {
          const response = await fetch("/api/world-heart", { cache: "no-store" });
          if (!response.ok) return;
          heart.setSnapshot(await response.json());
        } catch {
          heart.setSnapshot({ status: "WATCH" });
        }
      };

      fetchSnapshot();
      interval = window.setInterval(fetchSnapshot, 1000);
    });

    return () => {
      destroyed = true;
      if (interval) window.clearInterval(interval);
      app.destroy(true);
      appRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="az-world-heart" aria-label="Areloria WorldHeart live entropy monitor" />;
}
