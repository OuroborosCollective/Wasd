export interface ArtState {
    width: number;
    height: number;
    seed: number;
    pixels: string[];
}

export const getIndex = (x: number, y: number, width: number): number => {
    return y * width + x;
};

export const getCoordinates = (index: number, width: number): { x: number; y: number } => {
    return {
        x: index % width,
        y: Math.floor(index / width)
    };
};

export const validatePosition = (x: number, y: number, width: number, height: number): boolean => {
    return x >= 0 && x < width && y >= 0 && y < height;
};

export const deterministicHash = (seed: number, index: number): number => {
    let h = (seed ^ index) * 0x45d9f3b;
    h = ((h >>> 16) ^ h) * 0x45d9f3b;
    h = (h >>> 16) ^ h;
    return h >>> 0;
};

export const getColorFromSeed = (seed: number, index: number): string => {
    const hash = deterministicHash(seed, index);
    const h = hash % 360;
    const s = 50 + (hash % 30);
    const l = 40 + (hash % 20);
    return `hsl(${h}, ${s}%, ${l}%)`;
};

export const validateArtState = (state: ArtState): boolean => {
    if (!state.width || state.width <= 0) return false;
    if (!state.height || state.height <= 0) return false;
    if (!Array.isArray(state.pixels)) return false;
    if (state.pixels.length !== state.width * state.height) return false;
    return true;
};

export const initializeCanvas = (width: number, height: number, seed: number): ArtState => {
    const pixels: string[] = new Array(width * height);
    for (let i = 0; i < pixels.length; i++) {
        pixels[i] = getColorFromSeed(seed, i);
    }
    return {
        width,
        height,
        seed,
        pixels
    };
};

export const updatePixel = (state: ArtState, x: number, y: number, color: string): ArtState => {
    if (!validatePosition(x, y, state.width, state.height)) {
        return state;
    }
    const newPixels = [...state.pixels];
    newPixels[getIndex(x, y, state.width)] = color;
    return {
        ...state,
        pixels: newPixels
    };
};