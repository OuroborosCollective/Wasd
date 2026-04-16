/**
 * Rich, stackable in-game notification toasts for Areloria.
 *
 * Usage:
 *   showNotification("Quest accepted!", "success");
 *   showNotification("Connection lost.", "error", { duration: 6000 });
 *   showNotification("Low mana!", "warn", { icon: "🔵", title: "Mana Warning" });
 */

export type NotificationTone = "info" | "success" | "warn" | "error";

export interface NotificationOptions {
  title?: string;
  icon?: string;
  duration?: number;
  persistent?: boolean;
}

const MAX_VISIBLE = 5;
const CONTAINER_ID = "arel-notifications";
const ANIMATION_OUT_MS = 320;
const DEFAULT_DURATION = 4500;

const liveItems: HTMLElement[] = [];

const TONE_STYLES: Record<
  NotificationTone,
  { icon: string; borderColor: string; iconColor: string; barColor: string; titleColor: string }
> = {
  info: {
    icon: "ℹ️",
    borderColor: "rgba(100, 150, 255, 0.55)",
    iconColor: "#6b9fff",
    barColor: "rgba(100, 150, 255, 0.7)",
    titleColor: "#a0c0ff",
  },
  success: {
    icon: "✅",
    borderColor: "rgba(62, 207, 122, 0.55)",
    iconColor: "#3ecf7a",
    barColor: "rgba(62, 207, 122, 0.7)",
    titleColor: "#9ee0b8",
  },
  warn: {
    icon: "⚠️",
    borderColor: "rgba(242, 125, 38, 0.65)",
    iconColor: "#f27d26",
    barColor: "rgba(242, 125, 38, 0.75)",
    titleColor: "#ffb070",
  },
  error: {
    icon: "❌",
    borderColor: "rgba(220, 60, 60, 0.65)",
    iconColor: "#ff6b6b",
    barColor: "rgba(220, 60, 60, 0.75)",
    titleColor: "#ff9090",
  },
};

function getContainer(): HTMLElement {
  let container = document.getElementById(CONTAINER_ID);
  if (container) return container;

  container = document.createElement("div");
  container.id = CONTAINER_ID;

  Object.assign(container.style, {
    position: "fixed",
    bottom: "90px",
    right: "16px",
    zIndex: "10500",
    display: "flex",
    flexDirection: "column-reverse",
    gap: "8px",
    maxWidth: "min(380px, calc(100vw - 32px))",
    width: "min(380px, calc(100vw - 32px))",
    pointerEvents: "none",
    boxSizing: "border-box",
  });

  document.body.appendChild(container);
  return container;
}

function dismissItem(el: HTMLElement): void {
  if (el.dataset.dismissed === "1") return;
  el.dataset.dismissed = "1";

  el.style.transition = `opacity ${ANIMATION_OUT_MS}ms ease, transform ${ANIMATION_OUT_MS}ms ease`;
  el.style.opacity = "0";
  el.style.transform = "translateX(24px)";

  window.setTimeout(() => {
    el.remove();
    const idx = liveItems.indexOf(el);
    if (idx !== -1) liveItems.splice(idx, 1);
  }, ANIMATION_OUT_MS);
}

export function showNotification(
  message: string,
  tone: NotificationTone = "info",
  options: NotificationOptions = {}
): void {
  const { title, icon, duration: durationOpt, persistent = false } = options;
  const duration = typeof durationOpt === "number" && durationOpt > 0 ? durationOpt : DEFAULT_DURATION;
  const theme = TONE_STYLES[tone];
  const container = getContainer();

  while (liveItems.length >= MAX_VISIBLE) {
    const oldest = liveItems[0];
    if (oldest) dismissItem(oldest);
  }

  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.dataset.dismissed = "0";

  Object.assign(el.style, {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 12px 6px",
    background: "rgba(15, 18, 28, 0.97)",
    border: `1px solid ${theme.borderColor}`,
    borderLeft: `3px solid ${theme.borderColor}`,
    borderRadius: "10px",
    boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
    fontFamily: "system-ui, 'Segoe UI', sans-serif",
    fontSize: "13px",
    lineHeight: "1.4",
    color: "#e0e4f0",
    pointerEvents: "auto",
    cursor: "pointer",
    userSelect: "none",
    boxSizing: "border-box",
    overflow: "hidden",
    opacity: "0",
    transform: "translateX(24px)",
    transition: "opacity 280ms ease, transform 280ms ease",
    touchAction: "manipulation",
    backdropFilter: "blur(4px)",
  } as Partial<CSSStyleDeclaration>);
  el.style.setProperty("-webkit-backdrop-filter", "blur(4px)");

  const headerRow = document.createElement("div");
  Object.assign(headerRow.style, {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
  });

  const iconEl = document.createElement("span");
  iconEl.setAttribute("aria-hidden", "true");
  iconEl.textContent = icon ?? theme.icon;
  Object.assign(iconEl.style, {
    fontSize: "16px",
    lineHeight: "1.3",
    flexShrink: "0",
    marginTop: "1px",
    color: theme.iconColor,
  });

  const textBlock = document.createElement("div");
  Object.assign(textBlock.style, { flex: "1", minWidth: "0" });

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.textContent = title;
    Object.assign(titleEl.style, {
      fontSize: "11px",
      fontWeight: "bold",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      color: theme.titleColor,
      marginBottom: "2px",
    });
    textBlock.appendChild(titleEl);
  }

  const msgEl = document.createElement("div");
  msgEl.textContent = message;
  Object.assign(msgEl.style, {
    fontSize: "13px",
    color: "#d8dcea",
    wordBreak: "break-word",
    whiteSpace: "pre-line",
  });
  textBlock.appendChild(msgEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  Object.assign(closeBtn.style, {
    background: "none",
    border: "none",
    color: "rgba(200,210,255,0.5)",
    fontSize: "20px",
    lineHeight: "1",
    cursor: "pointer",
    padding: "10px",
    minWidth: "44px",
    minHeight: "44px",
    margin: "-6px -4px -6px 0",
    flexShrink: "0",
    alignSelf: "flex-start",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s ease",
  });
  closeBtn.addEventListener("mouseenter", () => {
    closeBtn.style.color = "#fff";
  });
  closeBtn.addEventListener("mouseleave", () => {
    closeBtn.style.color = "rgba(200,210,255,0.5)";
  });

  headerRow.appendChild(iconEl);
  headerRow.appendChild(textBlock);
  headerRow.appendChild(closeBtn);
  el.appendChild(headerRow);

  let progressBar: HTMLElement | null = null;
  if (!persistent) {
    const track = document.createElement("div");
    Object.assign(track.style, {
      height: "2px",
      background: "rgba(255,255,255,0.08)",
      borderRadius: "2px",
      marginTop: "4px",
      overflow: "hidden",
    });

    progressBar = document.createElement("div");
    Object.assign(progressBar.style, {
      height: "100%",
      width: "100%",
      borderRadius: "2px",
      background: theme.barColor,
      transformOrigin: "left center",
      transform: "scaleX(1)",
      transition: "none",
    });

    track.appendChild(progressBar);
    el.appendChild(track);
  }

  const handleDismiss = (e: Event) => {
    e.stopPropagation();
    dismissItem(el);
  };

  el.addEventListener(
    "click",
    (e) => {
      if (e.target === closeBtn) return;
      handleDismiss(e);
    },
    { passive: true }
  );
  closeBtn.addEventListener("click", handleDismiss, { passive: true });

  let touchStartX = 0;
  el.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0]?.clientX ?? 0;
    },
    { passive: true }
  );
  el.addEventListener(
    "touchend",
    (e) => {
      const endX = e.changedTouches[0]?.clientX ?? 0;
      if (endX - touchStartX > 60) dismissItem(el);
    },
    { passive: true }
  );

  let paused = false;
  let remainingMs = duration;
  let startedAt = 0;
  let autoTimer: ReturnType<typeof window.setTimeout> | null = null;

  const startCountdown = (ms: number) => {
    if (persistent) return;
    startedAt = Date.now();
    autoTimer = window.setTimeout(() => dismissItem(el), ms);
    if (progressBar) {
      void progressBar.offsetWidth;
      progressBar.style.transition = `transform ${ms}ms linear`;
      progressBar.style.transform = "scaleX(0)";
    }
  };

  const pauseCountdown = () => {
    if (persistent || paused || autoTimer === null) return;
    paused = true;
    remainingMs -= Date.now() - startedAt;
    window.clearTimeout(autoTimer);
    autoTimer = null;
    if (progressBar) {
      const elapsed = duration - remainingMs;
      const fraction = Math.max(0, Math.min(1, 1 - elapsed / duration));
      progressBar.style.transition = "none";
      progressBar.style.transform = `scaleX(${fraction})`;
    }
  };

  const resumeCountdown = () => {
    if (persistent || !paused) return;
    paused = false;
    if (progressBar) {
      void progressBar.offsetWidth;
      progressBar.style.transition = `transform ${remainingMs}ms linear`;
      progressBar.style.transform = "scaleX(0)";
    }
    startedAt = Date.now();
    autoTimer = window.setTimeout(() => dismissItem(el), remainingMs);
  };

  el.addEventListener("mouseenter", pauseCountdown, { passive: true });
  el.addEventListener("mouseleave", resumeCountdown, { passive: true });

  container.appendChild(el);
  liveItems.push(el);

  window.requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateX(0)";
    if (!persistent) {
      startCountdown(duration);
    }
  });
}

export const notifyInfo = (message: string, options?: NotificationOptions) =>
  showNotification(message, "info", options);

export const notifySuccess = (message: string, options?: NotificationOptions) =>
  showNotification(message, "success", options);

export const notifyWarn = (message: string, options?: NotificationOptions) =>
  showNotification(message, "warn", options);

export const notifyError = (message: string, options?: NotificationOptions) =>
  showNotification(message, "error", options);
