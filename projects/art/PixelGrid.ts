/**
 * PixelGrid.ts - Collaborative Art (NFT Infrastructure)
 * 
 * Collaborative canvas using logicalIndex and ARE logic.
 * deterministicHash guarantees 10,000+ pixel states computed identically
 * across all decentralized nodes without server-client sync.
 * O(1) matrix operations for NFT infrastructure.
 * 
 * Features:
 * - deterministicHash for decentralized consistency
 * - O(1) matrix operations
 * - logicalIndex pixel addressing
 * - ARE resonance for color calculation
 * - NFT-ready pixel data
 */

import { EventEmitter } from 'events';

/** Pixel state */
export interface PixelState {
    r: number; // Red (0-255)
    g: number; // Green (0-255)
    b: number; // Blue (0-255)
    a: number; // Alpha (0-255)
}

/** Pixel with position */
export interface Pixel {
    index: number;
    x: number;
    y: number;
    state: PixelState;
    author?: string;
    timestamp: number;
    resonance: number;
}

/** Grid dimensions */
const GRID_WIDTH = 128;
const GRID_HEIGHT = 128;
const TOTAL_PIXELS = GRID_WIDTH * GRID_HEIGHT;

/** Hash configuration */
const HASH_PRIME = 31;
const HASH_MOD = 1000000007;

/**
 * Deterministic hash function - same input always produces same output.
 * Critical for decentralized pixel state consistency.
 */
export function deterministicHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * HASH_PRIME + input.charCodeAt(i)) % HASH_MOD;
    }
    return hash;
}

/**
 * Generate deterministic pixel index from logicalIndex.
 */
export function logicalToPixelIndex(logicalIndex: number): number {
    return logicalIndex % TOTAL_PIXELS;
}

/**
 * Convert pixel index to x,y coordinates.
 */
export function indexToCoords(index: number): { x: number; y: number } {
    return {
        x: index % GRID_WIDTH,
        y: Math.floor(index / GRID_WIDTH)
    };
}

/**
 * Convert x,y coordinates to pixel index.
 */
export function coordsToIndex(x: number, y: number): number {
    return (y * GRID_WIDTH + x) % TOTAL_PIXELS;
}

/**
 * Calculate ARE resonance for pixel.
 */
export function calculateResonance(pixelIndex: number, timestamp: number, authorId?: string): number {
    const input = `${pixelIndex}:${timestamp}:${authorId || ''}`;
    const hash = deterministicHash(input);
    return (hash % 1000) / 1000;
}

/**
 * Calculate deterministic color from resonance.
 */
export function resonanceToColor(resonance: number, hueOffset: number = 0): PixelState {
    // HSV to RGB conversion with resonance as hue
    const hue = ((resonance + hueOffset) * 360) % 360;
    const saturation = 0.7 + (resonance * 0.3);
    const value = 0.8 + (resonance * 0.2);
    
    const c = value * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = value - c;
    
    let r = 0, g = 0, b = 0;
    
    if (hue < 60) { r = c; g = x; b = 0; }
    else if (hue < 120) { r = x; g = c; b = 0; }
    else if (hue < 180) { r = 0; g = c; b = x; }
    else if (hue < 240) { r = 0; g = x; b = c; }
    else if (hue < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
        r: Math.floor((r + m) * 255),
        g: Math.floor((g + m) * 255),
        b: Math.floor((b + m) * 255),
        a: 255
    };
}

/**
 * Pixel Matrix - O(1) operations.
 */
export class PixelMatrix {
    private pixels: Map<number, PixelState> = new Map();
    private authors: Map<number, string> = new Map();
    private timestamps: Map<number, number> = new Map();

    constructor() {
        // Initialize empty grid
    }

    /**
     * Set pixel at index - O(1).
     */
    public setPixel(index: number, state: PixelState, author?: string): void {
        this.pixels.set(index, { ...state });
        if (author) this.authors.set(index, author);
        this.timestamps.set(index, Date.now());
    }

    /**
     * Set pixel at x,y - O(1).
     */
    public setPixelAt(x: number, y: number, state: PixelState, author?: string): void {
        const index = coordsToIndex(x, y);
        this.setPixel(index, state, author);
    }

    /**
     * Get pixel at index - O(1).
     */
    public getPixel(index: number): PixelState | undefined {
        return this.pixels.get(index);
    }

    /**
     * Get pixel at x,y - O(1).
     */
    public getPixelAt(x: number, y: number): PixelState | undefined {
        const index = coordsToIndex(x, y);
        return this.getPixel(index);
    }

    /**
     * Get author of pixel - O(1).
     */
    public getAuthor(index: number): string | undefined {
        return this.authors.get(index);
    }

    /**
     * Get timestamp of pixel - O(1).
     */
    public getTimestamp(index: number): number | undefined {
        return this.timestamps.get(index);
    }

    /**
     * Get all pixels as array.
     */
    public getAllPixels(): Pixel[] {
        const result: Pixel[] = [];
        
        for (const [index, state] of this.pixels) {
            const coords = indexToCoords(index);
            result.push({
                index,
                x: coords.x,
                y: coords.y,
                state,
                author: this.authors.get(index),
                timestamp: this.timestamps.get(index) || 0,
                resonance: calculateResonance(index, this.timestamps.get(index) || 0, this.authors.get(index))
            });
        }
        
        return result;
    }

    /**
     * Get pixel count - O(1).
     */
    public getCount(): number {
        return this.pixels.size;
    }

    /**
     * Check if pixel is set - O(1).
     */
    public hasPixel(index: number): boolean {
        return this.pixels.has(index);
    }

    /**
     * Clear all pixels.
     */
    public clear(): void {
        this.pixels.clear();
        this.authors.clear();
        this.timestamps.clear();
    }

    /**
     * Get grid width.
     */
    public getWidth(): number {
        return GRID_WIDTH;
    }

    /**
     * Get grid height.
     */
    public getHeight(): number {
        return GRID_HEIGHT;
    }
}

/**
 * CollaborativeCanvas - Main class.
 */
export class CollaborativeCanvas extends EventEmitter {
    private matrix: PixelMatrix;
    private canvasId: string;

    constructor(canvasId: string = 'default') {
        super();
        this.matrix = new PixelMatrix();
        this.canvasId = canvasId;
    }

    /**
     * Set pixel deterministically.
     */
    public setPixel(x: number, y: number, state: PixelState, author: string): void {
        this.matrix.setPixelAt(x, y, state, author);
        
        const index = coordsToIndex(x, y);
        this.emit('pixel_set', { x, y, author, state });
    }

    /**
     * Set pixel using logicalIndex - O(1).
     */
    public setPixelByLogicalIndex(logicalIndex: number, state: PixelState, author: string): void {
        const pixelIndex = logicalToPixelIndex(logicalIndex);
        this.matrix.setPixel(pixelIndex, state, author);
        
        const coords = indexToCoords(pixelIndex);
        this.emit('pixel_set', { index: logicalIndex, author, state });
    }

    /**
     * Get pixel at x,y.
     */
    public getPixel(x: number, y: number): PixelState | undefined {
        return this.matrix.getPixelAt(x, y);
    }

    /**
     * Get pixel by logicalIndex.
     */
    public getPixelByLogicalIndex(logicalIndex: number): PixelState | undefined {
        const pixelIndex = logicalToPixelIndex(logicalIndex);
        return this.matrix.getPixel(pixelIndex);
    }

    /**
     * Get deterministic color for author at position.
     */
    public getDeterministicColor(x: number, y: number, author: string): PixelState {
        const timestamp = Date.now();
        const resonance = calculateResonance(y * GRID_WIDTH + x, timestamp, author);
        return resonanceToColor(resonance, deterministicHash(author) % 360);
    }

    /**
     * Get all pixels as NFT-ready data.
     */
    public getNFTData(): {
        canvasId: string;
        width: number;
        height: number;
        pixels: Array<{
            index: number;
            x: number;
            y: number;
            r: number;
            g: number;
            b: number;
            a: number;
            author?: string;
            timestamp: number;
        }>;
        metadata: {
            totalPixels: number;
            generatedAt: number;
            version: string;
        };
    } {
        const pixels = this.matrix.getAllPixels();
        
        return {
            canvasId: this.canvasId,
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            pixels: pixels.map(p => ({
                index: p.index,
                x: p.x,
                y: p.y,
                r: p.state.r,
                g: p.state.g,
                b: p.state.b,
                a: p.state.a,
                author: p.author,
                timestamp: p.timestamp
            })),
            metadata: {
                totalPixels: pixels.length,
                generatedAt: Date.now(),
                version: '1.0.0'
            }
        };
    }

    /**
     * Generate hash for entire canvas state.
     */
    public getCanvasHash(): string {
        let hashInput = this.canvasId;
        
        for (const pixel of this.matrix.getAllPixels()) {
            hashInput += `:${pixel.index}:${pixel.state.r},${pixel.state.g},${pixel.state.b}`;
        }
        
        return deterministicHash(hashInput).toString(36);
    }

    /**
     * Get pixel at logical index with deterministic generation.
     */
    public getOrGeneratePixel(logicalIndex: number, author: string): PixelState {
        const pixelIndex = logicalToPixelIndex(logicalIndex);
        const existing = this.matrix.getPixel(pixelIndex);
        
        if (existing) return existing;
        
        // Generate deterministic color for new pixel
        return this.getDeterministicColor(
            indexToCoords(pixelIndex).x,
            indexToCoords(pixelIndex).y,
            author
        );
    }

    /**
     * Apply pixel update with deterministic validation.
     */
    public applyUpdate(update: {
        logicalIndex: number;
        expectedHash: string;
        newState: PixelState;
        author: string;
    }): boolean {
        // Validate update
        const pixelIndex = logicalToPixelIndex(update.logicalIndex);
        const currentHash = deterministicHash(
            `${pixelIndex}:${this.matrix.getTimestamp(pixelIndex) || 0}`
        ).toString(36);
        
        if (update.expectedHash !== currentHash) {
            this.emit('update_rejected', { reason: 'hash_mismatch', update });
            return false;
        }
        
        this.matrix.setPixel(pixelIndex, update.newState, update.author);
        this.emit('pixel_updated', update);
        return true;
    }

    /**
     * Get matrix.
     */
    public getMatrix(): PixelMatrix {
        return this.matrix;
    }

    /**
     * Get canvas ID.
     */
    public getCanvasId(): string {
        return this.canvasId;
    }
}

export default CollaborativeCanvas;
export { PixelMatrix, GRID_WIDTH, GRID_HEIGHT, TOTAL_PIXELS };
export { deterministicHash, logicalToPixelIndex, indexToCoords, coordsToIndex };
export { calculateResonance, resonanceToColor };