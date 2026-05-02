import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile extends Projectile {
    private element: ElementType;

    constructor(scene: any, x: number, y: number, element: ElementType) {
        super(scene, x, y, "echo_projectile");
        this.element = element;
    }

    public onCollision(other: any): void {
        this.createEchoNode();
        if (typeof super.onCollision === 'function') {
            super.onCollision(other);
        }
    }

    public onTrigger(other: any): void {
        this.createEchoNode();
        if (typeof super.onTrigger === 'function') {
            super.onTrigger(other);
        }
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
        
        if (typeof this.destroy === 'function') {
            this.destroy();
        }
    }

    private getElementType(): ElementType {
        return this.element || ElementType.None;
    }
}