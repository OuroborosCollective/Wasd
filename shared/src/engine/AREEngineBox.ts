import { Vector3, Box3, Matrix4 } from 'three';

export class AREEngineBox {
    private min: Vector3;
    private max: Vector3;

    constructor(min?: Vector3, max?: Vector3) {
        this.min = min ? min.clone() : new Vector3(Infinity, Infinity, Infinity);
        this.max = max ? max.clone() : new Vector3(-Infinity, -Infinity, -Infinity);
    }

    public set(min: Vector3, max: Vector3): this {
        this.min.copy(min);
        this.max.copy(max);
        return this;
    }

    public setFromPoints(points: Vector3[]): this {
        this.makeEmpty();
        for (let i = 0; i < points.length; i++) {
            this.expandByPoint(points[i]);
        }
        return this;
    }

    public makeEmpty(): this {
        this.min.set(Infinity, Infinity, Infinity);
        this.max.set(-Infinity, -Infinity, -Infinity);
        return this;
    }

    public expandByPoint(point: Vector3): this {
        this.min.x = Math.min(this.min.x, point.x);
        this.min.y = Math.min(this.min.y, point.y);
        this.min.z = Math.min(this.min.z, point.z);
        this.max.x = Math.max(this.max.x, point.x);
        this.max.y = Math.max(this.max.y, point.y);
        this.max.z = Math.max(this.max.z, point.z);
        return this;
    }

    public applyMatrix4(matrix: Matrix4): this {
        const minX = this.min.x, minY = this.min.y, minZ = this.min.z;
        const maxX = this.max.x, maxY = this.max.y, maxZ = this.max.z;

        const points = [
            new Vector3(minX, minY, minZ).applyMatrix4(matrix),
            new Vector3(minX, minY, maxZ).applyMatrix4(matrix),
            new Vector3(minX, maxY, minZ).applyMatrix4(matrix),
            new Vector3(minX, maxY, maxZ).applyMatrix4(matrix),
            new Vector3(maxX, minY, minZ).applyMatrix4(matrix),
            new Vector3(maxX, minY, maxZ).applyMatrix4(matrix),
            new Vector3(maxX, maxY, minZ).applyMatrix4(matrix),
            new Vector3(maxX, maxY, maxZ).applyMatrix4(matrix)
        ];

        this.makeEmpty();
        for (let i = 0; i < points.length; i++) {
            this.expandByPoint(points[i]);
        }

        return this;
    }

    public intersects(other: AREEngineBox): boolean {
        const result: boolean = 
            this.max.x >= other.min.x &&
            this.min.x <= other.max.x &&
            this.max.y >= other.min.y &&
            this.min.y <= other.max.y &&
            this.max.z >= other.min.z &&
            this.min.z <= other.max.z;
        return result;
    }

    public containsPoint(point: Vector3): boolean {
        const result: boolean = 
            point.x >= this.min.x &&
            point.x <= this.max.x &&
            point.y >= this.min.y &&
            point.y <= this.max.y &&
            point.z >= this.min.z &&
            point.z <= this.max.z;
        return result;
    }

    public getMin(): Vector3 {
        return this.min;
    }

    public getMax(): Vector3 {
        return this.max;
    }

    public copy(source: AREEngineBox): this {
        this.min.copy(source.getMin());
        this.max.copy(source.getMax());
        return this;
    }

    public clone(): AREEngineBox {
        return new AREEngineBox().copy(this);
    }

    public toThreeBox3(): Box3 {
        return new Box3(this.min.clone(), this.max.clone());
    }
}