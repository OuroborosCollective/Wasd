export class SlidingWindow {
    private readonly buffer: Float64Array;
    private readonly size: number;
    private pointer: number = 0;
    private currentSum: number = 0;
    private itemsCount: number = 0;

    constructor(size: number) {
        if (size <= 0) {
            throw new Error("Window size must be greater than zero");
        }
        this.size = size;
        this.buffer = new Float64Array(size);
    }

    public add(value: number): void {
        const oldValue = this.buffer[this.pointer];
        this.currentSum -= oldValue;
        this.buffer[this.pointer] = value;
        this.currentSum += value;

        this.pointer = (this.pointer + 1) % this.size;

        if (this.itemsCount < this.size) {
            this.itemsCount++;
        }
    }

    public getAverage(): number {
        if (this.itemsCount === 0) {
            return 0;
        }
        return this.currentSum / this.itemsCount;
    }

    public getSum(): number {
        return this.currentSum;
    }

    public getCount(): number {
        return this.itemsCount;
    }

    public isFull(): boolean {
        return this.itemsCount === this.size;
    }

    public clear(): void {
        this.buffer.fill(0);
        this.pointer = 0;
        this.currentSum = 0;
        this.itemsCount = 0;
    }

    public getValues(): Float64Array {
        if (this.itemsCount < this.size) {
            return this.buffer.slice(0, this.itemsCount);
        }
        const result = new Float64Array(this.size);
        result.set(this.buffer.subarray(this.pointer));
        result.set(this.buffer.subarray(0, this.pointer), this.size - this.pointer);
        return result;
    }
}