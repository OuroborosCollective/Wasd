export interface IAREEngineBox {
    id: string;
    name: string;
    width: number;
    height: number;
    depth: number;
    positionX: number;
    positionY: number;
    positionZ: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    visible: boolean;
    metadata: Record<string, any>;
}

export class AREEngineBox implements IAREEngineBox {
    public id: string;
    public name: string;
    public width: number;
    public height: number;
    public depth: number;
    public positionX: number;
    public positionY: number;
    public positionZ: number;
    public rotationX: number;
    public rotationY: number;
    public rotationZ: number;
    public scaleX: number;
    public scaleY: number;
    public scaleZ: number;
    public visible: boolean;
    public metadata: Record<string, any>;

    constructor(config: Partial<IAREEngineBox> = {}) {
        this.id = config.id ?? "";
        this.name = config.name ?? "AREBox";
        this.width = config.width ?? 1;
        this.height = config.height ?? 1;
        this.depth = config.depth ?? 1;
        this.positionX = config.positionX ?? 0;
        this.positionY = config.positionY ?? 0;
        this.positionZ = config.positionZ ?? 0;
        this.rotationX = config.rotationX ?? 0;
        this.rotationY = config.rotationY ?? 0;
        this.rotationZ = config.rotationZ ?? 0;
        this.scaleX = config.scaleX ?? 1;
        this.scaleY = config.scaleY ?? 1;
        this.scaleZ = config.scaleZ ?? 1;
        this.visible = config.visible ?? true;
        this.metadata = config.metadata ?? {};
    }

    public update(data: Partial<IAREEngineBox>): void {
        if (data.id !== undefined) this.id = data.id;
        if (data.name !== undefined) this.name = data.name;
        if (data.width !== undefined) this.width = data.width;
        if (data.height !== undefined) this.height = data.height;
        if (data.depth !== undefined) this.depth = data.depth;
        if (data.positionX !== undefined) this.positionX = data.positionX;
        if (data.positionY !== undefined) this.positionY = data.positionY;
        if (data.positionZ !== undefined) this.positionZ = data.positionZ;
        if (data.rotationX !== undefined) this.rotationX = data.rotationX;
        if (data.rotationY !== undefined) this.rotationY = data.rotationY;
        if (data.rotationZ !== undefined) this.rotationZ = data.rotationZ;
        if (data.scaleX !== undefined) this.scaleX = data.scaleX;
        if (data.scaleY !== undefined) this.scaleY = data.scaleY;
        if (data.scaleZ !== undefined) this.scaleZ = data.scaleZ;
        if (data.visible !== undefined) this.visible = data.visible;
        if (data.metadata !== undefined) this.metadata = { ...this.metadata, ...data.metadata };
    }

    public toJSON(): IAREEngineBox {
        return {
            id: this.id,
            name: this.name,
            width: this.width,
            height: this.height,
            depth: this.depth,
            positionX: this.positionX,
            positionY: this.positionY,
            positionZ: this.positionZ,
            rotationX: this.rotationX,
            rotationY: this.rotationY,
            rotationZ: this.rotationZ,
            scaleX: this.scaleX,
            scaleY: this.scaleY,
            scaleZ: this.scaleZ,
            visible: this.visible,
            metadata: { ...this.metadata }
        };
    }
}