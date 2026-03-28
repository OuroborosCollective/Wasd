export function renderMapPanel() {
  const node = document.createElement("div");
  node.textContent = "Map panel placeholder";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.bottom = "12px";
  node.style.padding = "8px";
  node.style.background = "rgba(0,0,0,0.5)";
  node.style.color = "#fff";
  document.body.appendChild(node);
}