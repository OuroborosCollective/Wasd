export function renderEquipmentPanel() {
  const node = document.createElement("div");
  node.textContent = "Equipment";
  node.style.position = "fixed";
  node.style.right = "12px";
  node.style.top = "64px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}