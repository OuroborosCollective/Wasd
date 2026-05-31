import { IRenderer } from "./RendererManager";
import { AREPayload } from "@wasd/types";

export class ThreeRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {
    console.log("ThreeRenderer initialized");
  }
  render(_payload: AREPayload): void {
    // Three.js render logic
  }
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}
