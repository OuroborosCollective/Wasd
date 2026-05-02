import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile extends Projectile {
    public scene: any;
    public x: number;
    public y: number;
    public active: boolean = true;
    private element: ElementType;

    constructor(scene: any, x: number, y: number, element: ElementType) {
        super(scene, x, y, "echo_projectile");
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.element = element;
    }

    public onCollision(other: any): void {
        this.createEchoNode();
        this.destroy();
    }

    public onTrigger(other: any): void {
        this.createEchoNode();
        this.destroy();
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
    }

    private getElementType(): ElementType {
        return this.element || ElementType.None;
    }

    public destroy(): void {
        this.active = false;
        if (super.destroy) {
            super.destroy();
        }
    }
}