import { z } from 'zod';

export const Vector3Schema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0)
});

export type Vector3 = z.infer<typeof Vector3Schema>;

export const AREEngineBoxSchema = z.object({
    id: z.string().uuid(),
    name: z.string().default('AREEngineBox'),
    position: Vector3Schema.default({ x: 0, y: 0, z: 0 }),
    rotation: Vector3Schema.default({ x: 0, y: 0, z: 0 }),
    scale: Vector3Schema.default({ x: 1, y: 1, z: 1 }),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#FFFFFF'),
    opacity: z.number().min(0).max(1).default(1),
    visible: z.boolean().default(true),
    castShadow: z.boolean().default(true),
    receiveShadow: z.boolean().default(true),
    physicsEnabled: z.boolean().default(false)
});

export type IAREEngineBox = z.infer<typeof AREEngineBoxSchema>;

export class AREEngineBox implements IAREEngineBox {
    public id: string;
    public name: string;
    public position: Vector3;
    public rotation: Vector3;
    public scale: Vector3;
    public color: string;
    public opacity: number;
    public visible: boolean;
    public castShadow: boolean;
    public receiveShadow: boolean;
    public physicsEnabled: boolean;

    constructor(data: Partial<IAREEngineBox> & { id: string }) {
        const validated = AREEngineBoxSchema.parse(data);
        
        this.id = validated.id;
        this.name = validated.name;
        this.position = { ...validated.position };
        this.rotation = { ...validated.rotation };
        this.scale = { ...validated.scale };
        this.color = validated.color;
        this.opacity = validated.opacity;
        this.visible = validated.visible;
        this.castShadow = validated.castShadow;
        this.receiveShadow = validated.receiveShadow;
        this.physicsEnabled = validated.physicsEnabled;
    }

    public static fromJSON(json: unknown): AREEngineBox {
        const validated = AREEngineBoxSchema.parse(json);
        return new AREEngineBox(validated);
    }

    public update(data: Partial<IAREEngineBox>): void {
        const partialSchema = AREEngineBoxSchema.partial();
        const validated = partialSchema.parse(data);

        if (validated.name !== undefined) this.name = validated.name;
        if (validated.position !== undefined) this.position = { ...validated.position };
        if (validated.rotation !== undefined) this.rotation = { ...validated.rotation };
        if (validated.scale !== undefined) this.scale = { ...validated.scale };
        if (validated.color !== undefined) this.color = validated.color;
        if (validated.opacity !== undefined) this.opacity = validated.opacity;
        if (validated.visible !== undefined) this.visible = validated.visible;
        if (validated.castShadow !== undefined) this.castShadow = validated.castShadow;
        if (validated.receiveShadow !== undefined) this.receiveShadow = validated.receiveShadow;
        if (validated.physicsEnabled !== undefined) this.physicsEnabled = validated.physicsEnabled;
    }

    public toJSON(): IAREEngineBox {
        return {
            id: this.id,
            name: this.name,
            position: { ...this.position },
            rotation: { ...this.rotation },
            scale: { ...this.scale },
            color: this.color,
            opacity: this.opacity,
            visible: this.visible,
            castShadow: this.castShadow,
            receiveShadow: this.receiveShadow,
            physicsEnabled: this.physicsEnabled
        };
    }

    public clone(): AREEngineBox {
        const data = this.toJSON();
        data.id = crypto.randomUUID();
        return new AREEngineBox(data);
    }
}