export function showToast(text: string, ms = 4500) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = [
    "position:fixed",
    "bottom:80px",
    "left:50%",
    "transform:translateX(-50%)",
    "max-width:min(420px,90vw)",
    "padding:10px 16px",
    "background:rgba(20,28,48,0.95)",
    "color:#e8ecf5",
    "border:1px solid rgba(242,125,38,0.5)",
    "border-radius:10px",
    "font:13px/1.4 system-ui,sans-serif",
    "z-index:10050",
    "box-shadow:0 8px 24px rgba(0,0,0,0.45)",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(el);
  window.setTimeout(() => {
    el.remove();
  }, ms);
}
