/** Shared DOM helpers for bootstrap and fatal renderer errors. */

export function showBootStatus(message: string) {
  let status = document.getElementById("boot-status-banner") as HTMLDivElement | null;
  if (!status) {
    status = document.createElement("div");
    status.id = "boot-status-banner";
    status.style.position = "fixed";
    status.style.left = "12px";
    status.style.bottom = "12px";
    status.style.zIndex = "9999";
    status.style.padding = "8px 10px";
    status.style.background = "rgba(0,0,0,0.72)";
    status.style.borderLeft = "3px solid #f27d26";
    status.style.color = "#f7f7f7";
    status.style.fontFamily = "sans-serif";
    status.style.fontSize = "12px";
    status.style.maxWidth = "520px";
    document.body.appendChild(status);
  }
  status.textContent = message;
}

export type RendererFatalOptions = {
  title: string;
  detail: string;
  docHref?: string;
};

/**
 * Full-screen message when WebGL is missing or the GPU context is lost (no fallback engine).
 */
export function showRendererFatalOverlay(options: RendererFatalOptions) {
  const existing = document.getElementById("renderer-fatal-overlay");
  if (existing) {
    existing.remove();
  }
  const root = document.createElement("div");
  root.id = "renderer-fatal-overlay";
  root.setAttribute("role", "alert");
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:100000",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "box-sizing:border-box",
    "background:linear-gradient(160deg,#0b1020 0%,#151a2e 55%,#1a1428 100%)",
    "color:#e8eaf0",
    "font-family:system-ui,Segoe UI,sans-serif",
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "max-width:440px",
    "width:100%",
    "padding:28px 24px",
    "border-radius:12px",
    "background:rgba(12,16,32,0.92)",
    "border:1px solid rgba(255,255,255,0.12)",
    "box-shadow:0 24px 48px rgba(0,0,0,0.45)",
  ].join(";");

  const h1 = document.createElement("h1");
  h1.textContent = options.title;
  h1.style.cssText = "margin:0 0 12px;font-size:1.25rem;font-weight:600;line-height:1.3;";
  card.appendChild(h1);

  const p = document.createElement("p");
  p.textContent = options.detail;
  p.style.cssText = "margin:0 0 18px;font-size:0.95rem;line-height:1.5;opacity:0.92;";
  card.appendChild(p);

  if (options.docHref) {
    const a = document.createElement("a");
    a.href = options.docHref;
    a.textContent = "Documentation";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    a.style.cssText = "color:#7eb8ff;font-size:0.9rem;";
    card.appendChild(a);
  }

  root.appendChild(card);
  document.body.appendChild(root);
}
