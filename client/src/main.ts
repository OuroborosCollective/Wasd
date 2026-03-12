import { initRenderer } from "./engine/renderer";
import { connectSocket } from "./networking/websocketClient";
import { renderHUD } from "./ui/hud";
import { renderAuthUI, renderLogoutBtn } from "./ui/auth";

const canvas = document.createElement("canvas");
document.body.style.margin = "0";
document.body.appendChild(canvas);

let gameInitialized = false;

renderAuthUI(() => {
  if (!gameInitialized) {
    gameInitialized = true;
    initRenderer(canvas);
    connectSocket();
    renderHUD();
    renderLogoutBtn();
  }
});
