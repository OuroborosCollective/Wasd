export function renderChat(){
  const n = document.createElement("div");
  n.textContent = "Chat";
  n.style.position = "fixed";
  n.style.left = "12px";
  n.style.top = "56px";
  n.style.background = "rgba(0,0,0,0.55)";
  n.style.color = "#fff";
  n.style.padding = "8px";
  document.body.appendChild(n);
}