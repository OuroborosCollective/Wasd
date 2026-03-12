export function renderPartyPanel() {
  const node = document.createElement("div");
  node.textContent = "Party Panel";
  node.style.position = "fixed";
  node.style.left = "12px";
  node.style.top = "116px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}