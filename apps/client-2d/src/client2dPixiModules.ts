import { Application, Container, Graphics } from "pixi.js";

export type Client2DPixiModuleDecision = {
  readonly id: string;
  readonly use: "core" | "optional" | "avoid";
  readonly purpose: string;
  readonly reason: string;
  readonly replacement?: string;
};

export const CLIENT_2D_PIXI_MODULE_DECISIONS: readonly Client2DPixiModuleDecision[] = [
  {
    id: "pixi.js",
    use: "core",
    purpose: "Authoritative 2D renderer shell for tiles, entities, effects, and HUD glue.",
    reason: "Already present in @wasd/client-2d and compatible with the current Vite/ESM client.",
  },
  {
    id: "@pixi/tilemap",
    use: "optional",
    purpose: "High-volume chunk and tile rendering once atlas formats are stable.",
    reason: "Useful later, but this PR avoids lockfile drift by keeping a compatible internal chunk-layer boundary first.",
    replacement: "Client2DChunkLayer boundary in this file.",
  },
  {
    id: "@pixi/particle-emitter",
    use: "optional",
    purpose: "Large particle systems for spells, weather, dust, and combat effects.",
    reason: "Useful later, but simple deterministic visual bursts are enough before adding a new dependency.",
    replacement: "Client2DEffectBus in this file.",
  },
  {
    id: "pixi-filters",
    use: "optional",
    purpose: "Biome, resonance, weather, and damage visual filters.",
    reason: "Filters are GPU-expensive on Android; keep the boundary ready and apply them by layer, not per entity.",
    replacement: "Client2DVisualPolicy in this file.",
  },
  {
    id: "@pixi/sound",
    use: "optional",
    purpose: "Audio routing for UI, biome ambience, skills, and combat cues.",
    reason: "Audio must be unlocked by user gesture on mobile; this PR records sound intents without forcing autoplay.",
    replacement: "Client2DSoundIntentBus in this file.",
  },
  {
    id: "pixi-action / pixi-tween / pixi-timer / pixi-keyboard / pixi-game",
    use: "avoid",
    purpose: "Legacy action, tween, timer, keyboard, and state helpers.",
    reason: "Areloria needs server-authoritative 10Hz world logic. Client helpers must not become gameplay authority.",
    replacement: "Input intents, visual timers, and scene boundaries in this file.",
  },
  {
    id: "pixi-spine / pixi-live2d / pixi-dragonbones",
    use: "optional",
    purpose: "Special character animation pipelines.",
    reason: "Use later for premium portraits or avatars only after asset licensing and version compatibility are clear.",
    replacement: "Atlas/spritesheet animation first.",
  },
];

export type Client2DVisualIntent =
  | { readonly type: "footstep"; readonly x: number; readonly y: number }
  | { readonly type: "skill-burst"; readonly x: number; readonly y: number; readonly radius?: number }
  | { readonly type: "gather-spark"; readonly x: number; readonly y: number };

export type Client2DSoundIntent = {
  readonly id: "connect" | "skill" | "gather" | "interact" | "ui";
  readonly at: number;
  readonly volume: number;
};

type VisualParticle = {
  readonly node: Graphics;
  readonly bornAt: number;
  readonly ttlMs: number;
  readonly startAlpha: number;
  readonly driftX: number;
  readonly driftY: number;
};

type VisualTimer = {
  readonly id: string;
  readonly dueAt: number;
  readonly run: () => void;
};

export class Client2DVisualTimerBus {
  private nowMs = 0;
  private timers: VisualTimer[] = [];

  schedule(id: string, delayMs: number, run: () => void): void {
    this.timers.push({ id, dueAt: this.nowMs + Math.max(0, delayMs), run });
    this.timers.sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));
  }

  update(deltaMs: number): void {
    this.nowMs += Math.max(0, deltaMs);
    const ready: VisualTimer[] = [];
    while (this.timers.length > 0 && this.timers[0]!.dueAt <= this.nowMs) {
      ready.push(this.timers.shift()!);
    }
    ready.forEach((timer) => timer.run());
  }
}

export class Client2DSoundIntentBus {
  private readonly intents: Client2DSoundIntent[] = [];
  private unlocked = false;

  unlock(): void {
    this.unlocked = true;
  }

  queue(id: Client2DSoundIntent["id"], volume = 0.7): void {
    this.intents.push({ id, at: Date.now(), volume: Math.max(0, Math.min(1, volume)) });
    if (this.intents.length > 32) this.intents.shift();
  }

  drain(): Client2DSoundIntent[] {
    if (!this.unlocked) return [];
    return this.intents.splice(0, this.intents.length);
  }
}

export class Client2DEffectBus {
  private readonly particles: VisualParticle[] = [];

  constructor(private readonly layer: Container) {}

  emit(intent: Client2DVisualIntent): void {
    if (intent.type === "footstep") {
      this.addParticle(intent.x, intent.y + 20, 0x20351f, 360, 0.42, -0.25, -0.5, 8);
      return;
    }

    if (intent.type === "gather-spark") {
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        this.addParticle(intent.x, intent.y - 12, 0xb8ff9e, 520, 0.82, Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, 5);
      }
      return;
    }

    const radius = intent.radius ?? 34;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.addParticle(intent.x, intent.y, 0x78e6ff, 620, 0.86, Math.cos(angle) * 1.35, Math.sin(angle) * 1.35, Math.max(4, radius / 8));
    }
  }

  update(deltaMs: number): void {
    const step = Math.max(0, deltaMs);
    const now = performance.now();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]!;
      const age = now - particle.bornAt;
      const t = Math.min(1, age / particle.ttlMs);
      particle.node.alpha = particle.startAlpha * (1 - t);
      particle.node.x += particle.driftX * step * 0.08;
      particle.node.y += particle.driftY * step * 0.08;
      particle.node.scale.set(1 + t * 0.8);
      if (t >= 1) {
        particle.node.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private addParticle(x: number, y: number, color: number, ttlMs: number, alpha: number, driftX: number, driftY: number, radius: number): void {
    const node = new Graphics().circle(0, 0, radius).fill({ color, alpha });
    node.x = x;
    node.y = y;
    node.alpha = alpha;
    this.layer.addChild(node);
    this.particles.push({ node, bornAt: performance.now(), ttlMs, startAlpha: alpha, driftX, driftY });
  }
}

export type Client2DVisualPolicy = {
  readonly maxDeviceResolution: number;
  readonly maxLiveParticles: number;
  readonly filtersPerLayerOnly: boolean;
  readonly gameplayAuthority: "server-10hz-worldtick";
};

export const CLIENT_2D_VISUAL_POLICY: Client2DVisualPolicy = {
  maxDeviceResolution: 2,
  maxLiveParticles: 160,
  filtersPerLayerOnly: true,
  gameplayAuthority: "server-10hz-worldtick",
};

export function createClient2DPixiKit(app: Application, effectsLayer?: Container) {
  const fxLayer = effectsLayer ?? new Container();
  const effects = new Client2DEffectBus(fxLayer);
  const timers = new Client2DVisualTimerBus();
  const sound = new Client2DSoundIntentBus();

  const unlockSound = () => sound.unlock();
  window.addEventListener("pointerdown", unlockSound, { once: true });
  window.addEventListener("keydown", unlockSound, { once: true });

  return {
    decisions: CLIENT_2D_PIXI_MODULE_DECISIONS,
    policy: CLIENT_2D_VISUAL_POLICY,
    effects,
    timers,
    sound,
    update(deltaMs: number): void {
      timers.update(deltaMs);
      effects.update(deltaMs);
      sound.drain();
    },
    destroy(): void {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
      if (!effectsLayer && fxLayer.parent) fxLayer.parent.removeChild(fxLayer);
      if (!effectsLayer) fxLayer.destroy({ children: true });
      void app;
    },
  };
}
