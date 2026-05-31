// @ts-ignore
import { AREPayload } from "@wasd/types";
// @ts-ignore
import { BabylonRenderer } from "./BabylonRenderer";
// @ts-ignore
import { ThreeRenderer } from "./ThreeRenderer";
// @ts-ignore
import { ProxyRenderer } from "./ProxyRenderer";
import { PlexityGate } from "../plexity/PlexityGate";

export type RendererType = "WEBGPU" | "WEBGL" | "DOM";

export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(payload: AREPayload): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

/**
 * RendererManager
 * 
 * Orchestrates the selection and lifecycle of the visual interpreter.
 * It selects between Babylon (WebGPU), Three (WebGL), or Proxy (DOM) 
 * based on the device's capability and complexity requirements determined by PlexityGate.
 */
export class RendererManager {
  private currentRenderer: IRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private type: RendererType = "WEBGL";

  constructor() {}

  /**
   * Initializes the appropriate renderer based on environment and PlexityGate.
   */
  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    
    // Determine the optimal renderer type
    // @ts-ignore
    this.type = await PlexityGate.determineOptimalRenderer();

    switch (this.type) {
      case "WEBGPU":
        this.currentRenderer = new BabylonRenderer();
        break;
      case "WEBGL":
        this.currentRenderer = new ThreeRenderer();
        break;
      case "DOM":
      default:
        this.currentRenderer = new ProxyRenderer();
        break;
    }

    if (this.currentRenderer) {
      await this.currentRenderer.initialize(this.canvas);
      console.log(`[RendererManager] Initialized with ${this.type} backend.`);
    }
  }

  /**
   * Routes the AREPayload to the active renderer for visual interpretation.
   * Renderers remain stateless visual shells; logic resides in the core engine.
   */
  public update(payload: AREPayload): void {
    if (!this.currentRenderer) return;
    this.currentRenderer.render(payload);
  }

  /**
   * Handles canvas resizing.
   */
  public handleResize(width: number, height: number): void {
    if (this.currentRenderer) {
      this.currentRenderer.resize(width, height);
    }
  }

  /**
   * Switches renderer at runtime if needed (e.g., performance degradation).
   */
  public async switchRenderer(newType: RendererType): Promise<void> {
    if (this.type === newType || !this.canvas) return;

    this.dispose();
    this.type = newType;
    await this.initialize(this.canvas);
  }

  /**
   * Clean up resources.
   */
  public dispose(): void {
    if (this.currentRenderer) {
      this.currentRenderer.dispose();
      this.currentRenderer = null;
    }
  }

  public getActiveRendererType(): RendererType {
    return this.type;
  }
}

export const rendererManager = new RendererManager();