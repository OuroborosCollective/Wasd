import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile extends Projectile {
    public active: boolean = true;

    constructor(scene: any, x: number, y: number, element: ElementType) {
        super(scene, x, y, element);
    }

    public override onCollision(other: any): void {
        this.createEchoNode();
        super.onCollision(other);
    }

    public override onTrigger(other: any): void {
        this.createEchoNode();
        super.onTrigger(other);
    }

    private createEchoNode(): void {
        if (!this.active) return;

        const echoNode = new EchoNode(
            this.scene,
            this.x,
            this.y,
            this.getElementType()
        );

        if (this.scene && this.scene.add && typeof this.scene.add.existing === 'function') {
            this.scene.add.existing(echoNode);
        }

        this.active = false;
    }

    private getElementType(): ElementType {
        return (this as any).element || ElementType.None;
    }
}