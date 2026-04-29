export function encodeKappa(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
}

export function decodeKappa(key: string): { x: number, y: number, z: number } {
    const parts = key.split(",");
    return {
        x: parseInt(parts[0], 10),
        y: parseInt(parts[1], 10),
        z: parseInt(parts[2], 10)
    };
}