export function renderWeatherOverlay(label = "Clear") {
  const node = document.createElement("div");
  node.textContent = `Weather: ${label}`;
  node.style.position = "fixed";
  node.style.top = "12px";
  node.style.left = "160px";
  node.style.background = "rgba(0,0,0,0.55)";
  node.style.color = "#fff";
  node.style.padding = "8px";
  document.body.appendChild(node);
}