export function renderWorldEditorUI(){
  const n = document.createElement("div");
  n.textContent = "World Editor";
  n.style.position = "fixed";
  n.style.left = "50%";
  n.style.top = "12px";
  n.style.transform = "translateX(-50%)";
  n.style.background = "rgba(30,30,30,0.85)";
  n.style.color = "#fff";
  n.style.padding = "8px 12px";
  document.body.appendChild(n);
}