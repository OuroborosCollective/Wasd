import { IRenderer } from "./RendererManager";
import { AREPayload } from "@wasd/types";

export class ProxyRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {
    console.log("ProxyRenderer initialized");
  }
  render(_payload: AREPayload): void {
    // Proxy (DOM) render logic
  }
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}
