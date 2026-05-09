export interface IRenderer {
    initialize(canvas: HTMLCanvasElement): Promise<void>;
    render(): void;
    resize(): void;
    dispose(): void;
}
