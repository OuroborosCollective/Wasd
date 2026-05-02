import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile {
    public scene: any;
    public x: number;
    public y: number;
    public active: boolean = true;
    private element: ElementType;

    constructor(scene: any, x: number, y: number, element: ElementType) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.element = element;
    }

    public onCollision(other: any): void {
        this.createEchoNode();
    }

    public onTrigger(other: any): void {
        this.createEchoNode();
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
        return this.element || ElementType.None;
    }
}