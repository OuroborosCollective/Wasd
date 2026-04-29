export interface KappaPos {
    x: number;
    y: number;
}

export class KappaScalar {
    private static readonly SCALE = 1000;

    public static toInternal(value: number): number {
        return Math.floor(value * this.SCALE);
    }

    public static toExternal(internalValue: number): number {
        return internalValue / this.SCALE;
    }

    public static updatePosition(currentInternal: number, velocity: number): number {
        return currentInternal + Math.floor(velocity * this.SCALE);
    }

    public static createPos(x: number, y: number, isExternal: boolean = true): KappaPos {
        if (isExternal) {
            return {
                x: this.toInternal(x),
                y: this.toInternal(y)
            };
        }
        return { x: Math.floor(x), y: Math.floor(y) };
    }

    public static updateKappaPos(pos: KappaPos, velocity: { x: number; y: number }): KappaPos {
        return {
            x: this.updatePosition(pos.x, velocity.x),
            y: this.updatePosition(pos.y, velocity.y)
        };
    }

    public static toRenderPos(pos: KappaPos): { x: number; y: number } {
        return {
            x: this.toExternal(pos.x),
            y: this.toExternal(pos.y)
        };
    }
}