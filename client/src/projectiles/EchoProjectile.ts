import { Projectile } from "./Projectile";
import { EchoNode } from "../nodes/EchoNode";
import { ElementType } from "../types/ElementType";

export class EchoProjectile extends Projectile {
    public active: boolean = true;
    private element: ElementType;

    public declare scene: any;
    public declare x: number;
    public declare y: number;

    constructor(scene: any, x: number, y: number, element: ElementType) {
        super(scene, x, y, "echo_projectile");
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

    public destroy(fromScene?: boolean): void {
        this.active = false;
        super.destroy(fromScene);
    }
}