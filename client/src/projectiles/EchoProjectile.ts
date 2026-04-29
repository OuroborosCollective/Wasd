import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile extends Projectile {
    constructor(scene: any, x: number, y: number, element: ElementType) {
        super(scene, x, y, element);
    }

    public onCollision(other: any): void {
        this.createEchoNode();
        super.onCollision(other);
    }

    public onTrigger(other: any): void {
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

        if (this.scene.add && typeof this.scene.add.existing === 'function') {
            this.scene.add.existing(echoNode);
        }
    }

    private getElementType(): ElementType {
        return (this as any).element || ElementType.None;
    }
}