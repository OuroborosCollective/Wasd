export function renderOraclePanel() {
  const node = document.createElement("div");
  node.textContent = "Oracle";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "376px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}