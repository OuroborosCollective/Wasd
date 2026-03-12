export function renderChatPanel() {
  const node = document.createElement("div");
  node.textContent = "Chat";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.bottom = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}