import { IRenderer } from "./RendererManager";
import { AREPayload } from "@wasd/types";

export class BabylonRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {
    console.log("BabylonRenderer initialized");
  }
  render(_payload: AREPayload): void {
    // Babylon render logic
  }
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}
