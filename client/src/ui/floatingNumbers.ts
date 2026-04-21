/**
 * Floating combat numbers — damage, crit, heal, miss, XP, gold.
 * Each number floats upward and fades out over ~1.2s.
 */

const FLOAT_DURATION = 1200;

interface FloatingNumber {
  el: HTMLElement;
  startTime: number;
}

const active: FloatingNumber[] = [];
let animFrame: number | null = null;

const COLORS: Record<string, string> = {
  hit: "#ff4444",
  crit: "#ff8800",
  heal: "#44cc66",
  miss: "#888888",
  block: "#6688cc",
  xp: "#aa88ff",
  gold: "#ffcc00",
};

const LABELS: Record<string, string> = {
  miss: "MISS",
  block: "BLOCK",
};

export function spawnFloatingNumber(
  screenX: number,
  screenY: number,
  kind: string,
  value?: number,
): void {
  const el = document.createElement("div");
  const label = LABELS[kind];
  const text = label ?? (typeof value === "number" ? String(value) : kind);
  const isCrit = kind === "crit";

  el.textContent = isCrit ? `${text}!` : text;
  el.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "z-index:10200",
    "font-family:system-ui,sans-serif",
    "font-weight:bold",
    "text-shadow:0 1px 4px rgba(0,0,0,0.7)",
    "white-space:nowrap",
    "transition:none",
    `font-size:${isCrit ? "22px" : "16px"}`,
    `color:${COLORS[kind] ?? "#ffffff"}`,
    `left:${screenX + (Math.random() - 0.5) * 30}px`,
    `top:${screenY}px`,
  ].join(";");

  document.body.appendChild(el);
  active.push({ el, startTime: performance.now() });

  if (animFrame === null) {
    animFrame = requestAnimationFrame(animate);
  }
}

function animate(now: number) {
  for (let i = active.length - 1; i >= 0; i--) {
    const fn = active[i];
    const elapsed = now - fn.startTime;
    const t = Math.min(1, elapsed / FLOAT_DURATION);

    fn.el.style.transform = `translateY(${-50 * t}px)`;
    fn.el.style.opacity = String(1 - t * t);

    if (t >= 1) {
      fn.el.remove();
      active.splice(i, 1);
    }
  }

  if (active.length > 0) {
    animFrame = requestAnimationFrame(animate);
  } else {
    animFrame = null;
  }
}
