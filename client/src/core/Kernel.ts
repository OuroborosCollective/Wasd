import { ResonanceAudioBridge } from "../audio/ResonanceAudioBridge";

export class Kernel {
    private static instance: Kernel;
    private resonanceAudioBridge: ResonanceAudioBridge | null = null;
    private audioContext: AudioContext | null = null;
    private lastFrameTime: number = 0;
    private isRunning: boolean = false;

    constructor() {}

    public static getInstance(): Kernel {
        if (!Kernel.instance) {
            Kernel.instance = new Kernel();
        }
        return Kernel.instance;
    }

    public async boot(): Promise<void> {
        if (this.isRunning) return;
        
        if (!this.audioContext) {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContextClass();
        }

        if (this.audioContext!.state === 'suspended') {
            await this.audioContext!.resume();
        }

        if (!this.resonanceAudioBridge) {
            this.resonanceAudioBridge = new ResonanceAudioBridge();
        }

        await (this.resonanceAudioBridge as ResonanceAudioBridge).initialize(this.audioContext!);
        
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
        if (this.resonanceAudioBridge) {
            this.resonanceAudioBridge.update();
        }
    }

    public shutdown(): void {
        this.isRunning = false;
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }

    public getAudioBridge(): ResonanceAudioBridge | null {
        return this.resonanceAudioBridge;
    }

    public getAudioContext(): AudioContext | null {
        return this.audioContext;
    }
}