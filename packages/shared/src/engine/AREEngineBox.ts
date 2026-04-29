export interface IAREEngineBox {
    x: number;
    y: number;
    width: number;
    height: number;
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
    set(x: number, y: number, width: number, height: number): void;
    intersects(other: IAREEngineBox): boolean;
    contains(x: number, y: number): boolean;
}

export class AREEngineBox implements IAREEngineBox {
    public x: number;
    public y: number;
    public width: number;
    public height: number;

    constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public get left(): number {
        return this.x;
    }

    public get right(): number {
        return this.x + this.width;
    }

    public get top(): number {
        return this.y;
    }

    public get bottom(): number {
        return this.y + this.height;
    }

    public set(x: number, y: number, width: number, height: number): void {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public intersects(other: IAREEngineBox): boolean {
        return (
            this.left < other.right &&
            this.right > other.left &&
            this.top < other.bottom &&
            this.bottom > other.top
        );
    }

    public contains(x: number, y: number): boolean {
        return (
            x >= this.left &&
            x <= this.right &&
            y >= this.top &&
            y <= this.bottom
        );
    }

    public copyFrom(other: IAREEngineBox): void {
        this.x = other.x;
        this.y = other.y;
        this.width = other.width;
        this.height = other.height;
    }

    public clone(): AREEngineBox {
        return new AREEngineBox(this.x, this.y, this.width, this.height);
    }
}