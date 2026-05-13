/**
 * PulseUI.ts - Pulse-Resume (Interactive Web-UI)
 * 
 * Uses phaseShift and resonance to control DOM elements without classic keyframe animations.
 * O(1) UI-pulse with React or Vanilla JS elements.
 * 10-Hz deterministic tick synchronized with requestAnimationFrame.
 * 
 * Features:
 * - phaseShift based DOM control
 * - resonance-driven animations
 * - O(1) pulse updates
 * - requestAnimationFrame sync
 * - Premium builder component
 */

import { EventEmitter } from 'events';

/** Pulse configuration */
export interface PulseConfig {
    frequency: number;      // Hz (default: 10)
    amplitude: number;    // 0-1
    phase: number;       // 0-360 degrees
    resonance: number;  // 0-1
    decay: number;       // 0-1 per frame
}

/** Element state */
export interface ElementState {
    id: string;
    baseOpacity: number;
    currentOpacity: number;
    baseScale: number;
    currentScale: number;
    baseRotation: number;
    currentRotation: number;
    color: string;
    pulseOffset: number;
    lastTick: number;
}

/** Animatable property */
export type AnimatableProperty = 'opacity' | 'scale' | 'rotation' | 'translateX' | 'translateY' | 'filter';

/** Easing function type */
export type EasingFunction = (t: number) => number;

/** Default easing functions */
export const Easing = {
    linear: (t: number) => t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInSine: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
    easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
    easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
    elastic: (t: number) => {
        if (t === 0 || t === 1) return t;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
    bounce: (t: number) => {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
};

/** Phase shift calculator */
export function calculatePhaseShift(tickCount: number, frequency: number = 10): number {
    return (tickCount * frequency) % 360;
}

/** Resonance calculator */
export function calculateResonance(
    tickCount: number,
    amplitude: number = 1,
    decay: number = 0
): number {
    const phase = (tickCount / 10) * Math.PI * 2;
    const resonance = Math.sin(phase) * amplitude;
    const decayedResonance = resonance * Math.pow(1 - decay, tickCount);
    return (decayedResonance + 1) / 2; // Normalize to 0-1
}

/** Generate CSS custom property value */
export function generatePulseValue(
    property: AnimatableProperty,
    tickCount: number,
    config: PulseConfig
): string {
    const phase = calculatePhaseShift(tickCount, config.frequency);
    const resonance = calculateResonance(tickCount, config.amplitude, config.decay);
    const shiftedPhase = (phase + config.phase) * (Math.PI / 180);
    const easedValue = Easing.easeInOutSine(resonance);
    
    switch (property) {
        case 'opacity':
            return String(config.amplitude * easedValue + (1 - config.amplitude));
        case 'scale':
            return String(1 + (config.amplitude * 0.5 - 0.25) * Math.sin(shiftedPhase));
        case 'rotation':
            return `${Math.sin(shiftedPhase) * config.amplitude * 360}deg`;
        case 'translateX':
            return `${Math.sin(shiftedPhase) * config.amplitude * 50}px`;
        case 'translateY':
            return `${Math.cos(shiftedPhase) * config.amplitude * 50}px`;
        case 'filter':
            return `blur(${resonance * 10}px) brightness(${0.5 + resonance * 0.5})`;
        default:
            return '1';
    }
}

/**
 * PulseElement - Single element animation controller.
 */
export class PulseElement extends EventEmitter {
    private id: string;
    private element: HTMLElement | null;
    private state: ElementState;
    private config: PulseConfig;
    private isActive: boolean = false;

    constructor(
        id: string,
        element?: HTMLElement,
        config?: Partial<PulseConfig>
    ) {
        super();
        this.id = id;
        this.element = element || null;
        this.config = {
            frequency: config?.frequency || 10,
            amplitude: config?.amplitude || 1,
            phase: config?.phase || 0,
            resonance: config?.resonance || 0.5,
            decay: config?.decay || 0
        };
        this.state = {
            id,
            baseOpacity: 1,
            currentOpacity: 1,
            baseScale: 1,
            currentScale: 1,
            baseRotation: 0,
            currentRotation: 0,
            color: '',
            pulseOffset: 0,
            lastTick: 0
        };
    }

    /**
     * Attach to DOM element.
     */
    public attach(element: HTMLElement): void {
        this.element = element;
    }

    /**
     * Detach from DOM.
     */
    public detach(): void {
        this.element = null;
        this.isActive = false;
    }

    /**
     * Start pulsing.
     */
    public start(): void {
        this.isActive = true;
        this.state.lastTick = 0;
        this.emit('started', this.id);
    }

    /**
     * Stop pulsing.
     */
    public stop(): void {
        this.isActive = false;
        this.reset();
        this.emit('stopped', this.id);
    }

    /**
     * Update state for current tick.
     */
    public update(tickCount: number): void {
        if (!this.isActive || !this.element) return;
        
        const phase = calculatePhaseShift(tickCount, this.config.frequency);
        const resonance = calculateResonance(tickCount, this.config.amplitude, this.config.decay);
        const shiftedPhase = ((phase + this.config.phase + this.state.pulseOffset) * Math.PI) / 180;
        
        // Calculate new values with easing
        this.state.currentOpacity = this.state.baseOpacity * (0.5 + resonance * 0.5);
        this.state.currentScale = 1 + (Easing.easeInOutSine(resonance) * 0.2 - 0.1);
        this.state.currentRotation = Math.sin(shiftedPhase) * 90;
        this.state.lastTick = tickCount;
        
        // Apply to element
        this.applyStyles();
        this.emit('updated', { id: this.id, tickCount, state: this.state });
    }

    /**
     * Apply computed styles to element.
     */
    private applyStyles(): void {
        if (!this.element) return;
        
        const style = this.element.style;
        style.opacity = String(this.state.currentOpacity);
        style.transform = `scale(${this.state.currentScale}) rotate(${this.state.currentRotation}deg)`;
        style.transition = 'none'; // Disable CSS transitions for frame sync
    }

    /**
     * Reset to base state.
     */
    public reset(): void {
        this.state.currentOpacity = this.state.baseOpacity;
        this.state.currentScale = this.state.baseScale;
        this.state.currentRotation = this.state.baseRotation;
        
        if (this.element) {
            this.element.style.opacity = String(this.state.baseOpacity);
            this.element.style.transform = `scale(${this.state.baseScale}) rotate(${this.state.baseRotation}deg)`;
        }
    }

    /**
     * Set base opacity.
     */
    public setBaseOpacity(opacity: number): void {
        this.state.baseOpacity = Math.max(0, Math.min(1, opacity));
    }

    /**
     * Set base scale.
     */
    public setBaseScale(scale: number): void {
        this.state.baseScale = Math.max(0.1, scale);
    }

    /**
     * Set pulse offset.
     */
    public setPulseOffset(offset: number): void {
        this.state.pulseOffset = offset % 360;
    }

    /**
     * Set config.
     */
    public setConfig(config: Partial<PulseConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get state.
     */
    public getState(): ElementState {
        return { ...this.state };
    }

    /**
     * Check if active.
     */
    public isPulsing(): boolean {
        return this.isActive;
    }
}

/**
 * PulseManager - O(1) multi-element controller.
 */
export class PulseManager extends EventEmitter {
    private elements: Map<string, PulseElement> = new Map();
    private tickCount: number = 0;
    private isRunning: boolean = false;
    private animationFrameId: number | null = null;
    private lastFrameTime: number = 0;
    private targetFPS: number = 10;
    private frameInterval: number = 1000 / 10; // 100ms for 10Hz

    constructor(targetFPS: number = 10) {
        super();
        this.targetFPS = targetFPS;
        this.frameInterval = 1000 / targetFPS;
    }

    /**
     * Register element.
     */
    public register(id: string, element?: HTMLElement, config?: Partial<PulseConfig>): PulseElement {
        const pulse = new PulseElement(id, element, config);
        this.elements.set(id, pulse);
        this.emit('registered', id);
        return pulse;
    }

    /**
     * Unregister element.
     */
    public unregister(id: string): boolean {
        const element = this.elements.get(id);
        if (!element) return false;
        
        element.stop();
        this.elements.delete(id);
        this.emit('unregistered', id);
        return true;
    }

    /**
     * Get element.
     */
    public get(id: string): PulseElement | undefined {
        return this.elements.get(id);
    }

    /**
     * Start all pulses synchronized with requestAnimationFrame.
     */
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.tickCount = 0;
        this.lastFrameTime = performance.now();
        
        this.emit('started');
        this.tick();
    }

    /**
     * Stop all pulses.
     */
    public stop(): void {
        this.isRunning = false;
        
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        for (const element of this.elements.values()) {
            element.stop();
        }
        
        this.emit('stopped');
    }

    /**
     * Main tick loop synchronized with requestAnimationFrame.
     */
    private tick = (): void => {
        if (!this.isRunning) return;
        
        const now = performance.now();
        const elapsed = now - this.lastFrameTime;
        
        if (elapsed > this.frameInterval) {
            this.lastFrameTime = now - (elapsed % this.frameInterval);
            this.tickCount++;
            
            // Update all elements - O(n) where n = element count
            for (const element of this.elements.values()) {
                if (element.isPulsing()) {
                    element.update(this.tickCount);
                }
            }
            
            this.emit('tick', this.tickCount);
        }
        
        this.animationFrameId = requestAnimationFrame(this.tick);
    }

    /**
     * Get all elements - O(n).
     */
    public getAllElements(): PulseElement[] {
        return Array.from(this.elements.values());
    }

    /**
     * Get element count.
     */
    public getCount(): number {
        return this.elements.size;
    }

    /**
     * Get current tick count.
     */
    public getTickCount(): number {
        return this.tickCount;
    }

    /**
     * Check if running.
     */
    public isActive(): boolean {
        return this.isRunning;
    }
}

/**
 * Create premium UI component.
 */
export function createPulseUI(
    container: HTMLElement,
    config?: { frequency?: number; amplitude?: number }
): PulseManager {
    const manager = new PulseManager(config?.frequency || 10);
    
    // Find all pulse-eligible elements
    const pulseElements = container.querySelectorAll('[data-pulse]');
    
    for (const el of Array.from(pulseElements)) {
        const id = (el as HTMLElement).dataset.pulse || `pulse_${manager.getCount()}`;
        const amplitude = parseFloat((el as HTMLElement).dataset.pulseAmplitude || '1') || 1;
        const frequency = parseFloat((el as HTMLElement).dataset.pulseFrequency || '10') || 10;
        
        manager.register(id, el as HTMLElement, { amplitude, frequency });
    }
    
    return manager;
}

/**
 * Pre-built pulse hook for React.
 */
export function usePulseEffect(
    element: HTMLElement | null,
    config: PulseConfig
): void {
    if (!element) return;
    
    const manager = new PulseManager(config.frequency);
    const pulse = manager.register('react-pulse', element, config);
    pulse.start();
    manager.start();
    
    return () => {
        manager.stop();
        pulse.stop();
    };
}

export default PulseManager;
export { PulseElement };
export { calculatePhaseShift, calculateResonance, generatePulseValue };
export { Easing };
export type { PulseConfig, ElementState, AnimatableProperty, EasingFunction };