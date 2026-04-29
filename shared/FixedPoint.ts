export class FixedPoint {
    public x: bigint;
    public y: bigint;

    constructor(x: number | bigint, y: number | bigint) {
        this.x = BigInt(x);
        this.y = BigInt(y);
    }
}