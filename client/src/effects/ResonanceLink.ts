export interface Vector2D {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    position: Vector2D;
    radius: number;
    takeDamage: (amount: number, type: string) => void;
    applyDebuff: (debuffType: string, duration: number) => void;
}

export enum ElementalCombination {
    STEAM = "STEAM",
    OVERLOAD = "OVERLOAD",
    MELT = "MELT",
    SWIRL = "SWIRL",
    CONDUCTIVE = "CONDUCTIVE"
}

export class ResonanceLink {
    private startEntity: Entity;
    private endEntity: Entity;
    private combination: ElementalCombination;
    private tickTimer: number = 0;
    private readonly TICK_INTERVAL: number = 0.2; // 5 times per second
    private readonly CURVE_SAMPLES: number = 15;
    private readonly COLLISION_THRESHOLD: number = 12;

    constructor(start: Entity, end: Entity, combination: ElementalCombination) {
        this.startEntity = start;
        this.endEntity = end;
        this.combination = combination;
    }

    public update(deltaTime: number, worldEntities: Entity[]): void {
        this.tickTimer += deltaTime;
        
        if (this.tickTimer >= this.TICK_INTERVAL) {
            const curvePoints = this.calculateBezierPoints(this.CURVE_SAMPLES);
            this.processCollision(curvePoints, worldEntities);
            this.tickTimer = 0;
        }
    }

    public calculateBezierPoints(segments: number): Vector2D[] {
        const points: Vector2D[] = [];
        const p0 = this.startEntity.position;
        const p2 = this.endEntity.position;
        
        const midX = (p0.x + p2.x) / 2;
        const midY = (p0.y + p2.y) / 2;
        const dx = p2.x - p0.x;
        const dy = p2.y - p0.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const offset = Math.sin(Date.now() * 0.005) * 20; 
        const p1: Vector2D = {
            x: midX - dy * (0.15 + offset / dist),
            y: midY + dx * (0.15 + offset / dist)
        };

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const cx = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
            const cy = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
            points.push({ x: cx, y: cy });
        }
        return points;
    }

    private processCollision(points: Vector2D[], targets: Entity[]): void {
        for (const target of targets) {
            if (target.id === this.startEntity.id || target.id === this.endEntity.id) continue;

            let isTouching = false;
            for (let i = 0; i < points.length - 1; i++) {
                if (this.pointToSegmentDistance(target.position, points[i], points[i + 1]) < (target.radius + this.COLLISION_THRESHOLD)) {
                    isTouching = true;
                    break;
                }
            }

            if (isTouching) {
                this.applyResonanceEffects(target);
            }
        }
    }

    private pointToSegmentDistance(p: Vector2D, v: Vector2D, w: Vector2D): number {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
    }

    private applyResonanceEffects(target: Entity): void {
        const damagePerTick = 15;

        switch (this.combination) {
            case ElementalCombination.STEAM:
                target.takeDamage(damagePerTick * 1.2, "fire");
                target.applyDebuff("movement_slow", 1.5);
                break;
            case ElementalCombination.OVERLOAD:
                target.takeDamage(damagePerTick * 1.8, "chaos");
                target.applyDebuff("micro_stun", 0.2);
                break;
            case ElementalCombination.MELT:
                target.takeDamage(damagePerTick * 2.2, "frost");
                target.applyDebuff("armor_shred", 3.0);
                break;
            case ElementalCombination.SWIRL:
                target.takeDamage(damagePerTick * 0.8, "wind");
                target.applyDebuff("elemental_spread", 2.0);
                break;
            case ElementalCombination.CONDUCTIVE:
                target.takeDamage(damagePerTick * 1.4, "lightning");
                target.applyDebuff("chain_reaction", 1.0);
                break;
        }
    }

    public getLinkState() {
        return {
            start: this.startEntity.position,
            end: this.endEntity.position,
            combination: this.combination,
            active: true
        };
    }
}