const SCALE = 1000000;

export function toFixed(val: number): number {
    return Math.round(val * SCALE);
}

export function addFixed(a: number, b: number): number {
    return Math.trunc(a + b);
}

export function mulFixed(a: number, b: number): number {
    return Math.trunc((a * b) / SCALE);
}