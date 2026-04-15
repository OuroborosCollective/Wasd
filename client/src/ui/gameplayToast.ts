type GameplayToastOptions = {
  durationMs?: number;
};

const TOAST_CONTAINER_ID = "areloria-gameplay-toast-stack";

function ensureToastContainer(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(TOAST_CONTAINER_ID);
  if (existing instanceof HTMLDivElement) {
    return existing;
  }
  const container = document.createElement("div");
  container.id = TOAST_CONTAINER_ID;
  container.style.position = "fixed";
  container.style.left = "50%";
  container.style.bottom = "max(130px, env(safe-area-inset-bottom, 0px))";
  container.style.transform = "translateX(-50%)";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  container.style.alignItems = "center";
  container.style.pointerEvents = "none";
  container.style.zIndex = "11500";
  container.style.width = "min(92vw, 560px)";
  document.body.appendChild(container);
  return container;
}

export function showGameplayToast(message: string, options: GameplayToastOptions = {}): void {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return;
  const container = ensureToastContainer();
  if (!container) return;

  const toast = document.createElement("div");
  toast.textContent = text;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.style.background = "rgba(8, 14, 28, 0.92)";
  toast.style.border = "1px solid rgba(114, 180, 255, 0.45)";
  toast.style.borderRadius = "10px";
  toast.style.padding = "10px 14px";
  toast.style.color = "#e8eefc";
  toast.style.fontFamily = "system-ui, sans-serif";
  toast.style.fontSize = "13px";
  toast.style.lineHeight = "1.4";
  toast.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.45)";
  toast.style.maxWidth = "100%";
  toast.style.wordBreak = "break-word";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(6px)";
  toast.style.transition = "opacity 150ms ease, transform 150ms ease";

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  const durationMs = Math.max(1200, Number(options.durationMs ?? 3200) || 3200);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    window.setTimeout(() => {
      toast.remove();
    }, 180);
  }, durationMs);
}
