import { ResonanceAudioBridge } from "../audio/ResonanceAudioBridge";

export class Kernel {
    private static instance: Kernel;
    private resonanceAudioBridge: ResonanceAudioBridge;
    private lastFrameTime: number = 0;
    private isRunning: boolean = false;

    constructor() {
        this.resonanceAudioBridge = new ResonanceAudioBridge();
    }

    public static getInstance(): Kernel {
        if (!Kernel.instance) {
            Kernel.instance = new Kernel();
        }
        return Kernel.instance;
    }

    public async boot(): Promise<void> {
        if (this.isRunning) return;
        
        await this.resonanceAudioBridge.initialize();
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        
        requestAnimationFrame((time) => this.loop(time));
    }

    private loop(currentTime: number): void {
        if (!this.isRunning) return;

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        this.update(deltaTime);

        requestAnimationFrame((time) => this.loop(time));
    }

    private update(deltaTime: number): void {
        this.resonanceAudioBridge.update(deltaTime);
    }

    public shutdown(): void {
        this.isRunning = false;
    }

    public getAudioBridge(): ResonanceAudioBridge {
        return this.resonanceAudioBridge;
    }
}