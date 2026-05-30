// Minimal implementations to satisfy the manager until full porting is complete
export interface IRenderer {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(payload: any): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export class BabylonRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {}
  render(_payload: any): void {}
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}

export class ThreeRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {}
  render(_payload: any): void {}
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}

export class ProxyRenderer implements IRenderer {
  async initialize(_canvas: HTMLCanvasElement): Promise<void> {}
  render(_payload: any): void {}
  resize(_width: number, _height: number): void {}
  dispose(): void {}
}

export type RendererType = "WEBGPU" | "WEBGL" | "DOM";

/**
 * RendererManager
 * 
 * Orchestrates the selection and lifecycle of the visual interpreter.
 */
export class RendererManager {
  private currentRenderer: IRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private type: RendererType = "WEBGL";

  constructor() {}

  /**
   * Initializes the appropriate renderer based on environment.
   */
  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    
    // Determine the optimal renderer type - fallback to WEBGL for now
    this.type = "WEBGL";

    const typeStr = this.type as string;

    switch (typeStr) {
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
   * Routes the payload to the active renderer for visual interpretation.
   */
  public update(payload: any): void {
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
   * Switches renderer at runtime if needed.
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
