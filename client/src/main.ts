import { bootAreloriaClient } from "./clientBoot";
import { showBootStatus } from "./bootUi";

let canvas = document.getElementById("application-canvas") as HTMLCanvasElement;
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.id = "application-canvas";
  document.body.appendChild(canvas);
}
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

void bootAreloriaClient(canvas).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Fatal client bootstrap error:", error);
  showBootStatus(`Fatal bootstrap error: ${message}`);
});
