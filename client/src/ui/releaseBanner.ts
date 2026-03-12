export function renderReleaseBanner() {
  const node = document.createElement("div");
  node.textContent = "Areloria Working Build";
  node.style.position = "fixed";
  node.style.top = "0";
  node.style.left = "50%";
  node.style.transform = "translateX(-50%)";
  node.style.background = "#222";
  node.style.color = "#fff";
  node.style.padding = "6px 12px";
  document.body.appendChild(node);
}