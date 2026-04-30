import { AREStateCompiler } from './AREStateCompiler';

export interface IAREEngineHost<TState> {
    getState(): TState;
    applyState(state: TState): void;
    onStateTransition(oldState: TState, newState: TState): void;
}

export interface IAREInput {
    action: string;
    payload: any;
    timestamp: number;
}

export class AREEngineBox<TState> {
    private readonly host: IAREEngineHost<TState>;
    private readonly compiler: AREStateCompiler;
    private inputQueue: IAREInput[] = [];
    private lastTick: number = 0;

    constructor(host: IAREEngineHost<TState>, compiler: AREStateCompiler) {
        this.host = host;
        this.compiler = compiler;
        this.lastTick = Date.now();
    }

    /**
     * Fügt einen neuen Input in die Warteschlange ein.
     */
    public enqueueInput(input: IAREInput): void {
        this.inputQueue.push(input);
    }

    /**
     * Führt einen Engine-Tick aus. 
     * Verarbeitet die Input-Queue und berechnet den neuen Zustand über den Compiler.
     */
    public tick(): void {
        const now = Date.now();
        const deltaTime = (now - this.lastTick) / 1000;
        this.lastTick = now;

        const currentState = this.host.getState();
        const pendingInputs = this.flushQueue();

        try {
            const nextState = ((this.compiler as any).compileAndExecute)(
                currentState,
                pendingInputs,
                deltaTime
            );

            if (this.hasChanges(currentState, nextState)) {
                this.host.applyState(nextState);
                this.host.onStateTransition(currentState, nextState);
            }
        } catch (error) {
            console.error("AREEngineBox: Error during state compilation", error);
        }
    }

    /**
     * Extrahiert alle anstehenden Inputs und leert die Queue.
     */
    private flushQueue(): IAREInput[] {
        const inputs = [...this.inputQueue];
        this.inputQueue = [];
        return inputs;
    }

    /**
     * Prüft auf strukturelle Änderungen im Zustand.
     */
    private hasChanges(oldState: TState, newState: TState): boolean {
        if (oldState === newState) return false;
        return JSON.stringify(oldState) !== JSON.stringify(newState);
    }

    /**
     * Setzt den Tick-Orchestrator zurück.
     */
    public reset(): void {
        this.inputQueue = [];
        this.lastTick = Date.now();
    }

    /**
     * Gibt die aktuelle Anzahl der gepufferten Inputs zurück.
     */
    public get pendingInputCount(): number {
        return this.inputQueue.length;
    }
}