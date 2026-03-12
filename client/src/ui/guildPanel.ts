export function renderGuildPanel() {
  const node = document.createElement("div");
  node.textContent = "Guild Panel";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}