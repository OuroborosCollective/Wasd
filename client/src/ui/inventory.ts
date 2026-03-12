export function renderInventory(){
  const n = document.createElement("div");
  n.textContent = "Inventory";
  n.style.position = "fixed";
  n.style.right = "12px";
  n.style.top = "56px";
  n.style.background = "rgba(0,0,0,0.55)";
  n.style.color = "#fff";
  n.style.padding = "8px";
  document.body.appendChild(n);
}