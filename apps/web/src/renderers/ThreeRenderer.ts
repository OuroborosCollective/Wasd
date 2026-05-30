import { AREPayload } from "@wasd/shared";
import { IRenderer } from "./RendererManager";

export class ThreeRenderer implements IRenderer {
  public async initialize(_canvas: HTMLCanvasElement): Promise<void> {}
  public render(_payload: AREPayload): void {}
  public resize(_width: number, _height: number): void {}
  public dispose(): void {}
}
