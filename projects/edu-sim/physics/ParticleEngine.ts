export interface KappaPos {
    x: number;
    y: number;
    z: number;
}

export class Atom {
    public pos: KappaPos;
    public vel: KappaPos;
    public acc: KappaPos;
    public mass: number;
    public radius: number;
    public charge: number;

    constructor(x: number, y: number, z: number, mass: number = 1.0, radius: number = 0.5) {
        this.pos = { x, y, z };
        this.vel = { x: 0, y: 0, z: 0 };
        this.acc = { x: 0, y: 0, z: 0 };
        this.mass = mass;
        this.radius = radius;
        this.charge = 0;
    }
}

export class ParticleEngine {
    private atoms: Atom[];
    private maxAtoms: number;
    private currentAtomCount: number;
    
    public kappaScalar: number = 0.1;
    public drag: number = 0.98;
    public gravity: number = -0.05;

    constructor(maxAtoms: number) {
        this.maxAtoms = maxAtoms;
        this.atoms = new Array<Atom>(maxAtoms);
        this.currentAtomCount = 0;
    }

    public addAtom(x: number, y: number, z: number, mass: number): void {
        if (this.currentAtomCount < this.maxAtoms) {
            this.atoms[this.currentAtomCount] = new Atom(x, y, z, mass);
            this.currentAtomCount++;
        }
    }

    public update(dt: number, worldBounds: KappaPos): void {
        const count = this.currentAtomCount;
        const atoms = this.atoms;
        const k = this.kappaScalar;
        const d = this.drag;
        const g = this.gravity;

        for (let i = 0; i < count; i++) {
            const a = atoms[i];

            a.acc.y += g;

            a.vel.x = (a.vel.x + a.acc.x * dt) * d;
            a.vel.y = (a.vel.y + a.acc.y * dt) * d;
            a.vel.z = (a.vel.z + a.acc.z * dt) * d;

            a.pos.x += a.vel.x * k;
            a.pos.y += a.vel.y * k;
            a.pos.z += a.vel.z * k;

            a.acc.x = 0;
            a.acc.y = 0;
            a.acc.z = 0;

            this.handleBounds(a, worldBounds);
        }

        this.resolveCollisions(count, atoms);
    }

    private handleBounds(a: Atom, b: KappaPos): void {
        const r = a.radius;
        if (a.pos.x < r) { a.pos.x = r; a.vel.x *= -0.5; }
        else if (a.pos.x > b.x - r) { a.pos.x = b.x - r; a.vel.x *= -0.5; }

        if (a.pos.y < r) { a.pos.y = r; a.vel.y *= -0.5; }
        else if (a.pos.y > b.y - r) { a.pos.y = b.y - r; a.vel.y *= -0.5; }

        if (a.pos.z < r) { a.pos.z = r; a.vel.z *= -0.5; }
        else if (a.pos.z > b.z - r) { a.pos.z = b.z - r; a.vel.z *= -0.5; }
    }

    private resolveCollisions(count: number, atoms: Atom[]): void {
        for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
                const a = atoms[i];
                const b = atoms[j];
                
                const dx = b.pos.x - a.pos.x;
                const dy = b.pos.y - a.pos.y;
                const dz = b.pos.z - a.pos.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const minDist = a.radius + b.radius;

                if (distSq < minDist * minDist) {
                    const dist = Math.sqrt(distSq) || 0.0001;
                    const overlap = (minDist - dist) / 2;
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const nz = dz / dist;

                    a.pos.x -= nx * overlap;
                    a.pos.y -= ny * overlap;
                    a.pos.z -= nz * overlap;
                    b.pos.x += nx * overlap;
                    b.pos.y += ny * overlap;
                    b.pos.z += nz * overlap;

                    const relVelX = b.vel.x - a.vel.x;
                    const relVelY = b.vel.y - a.vel.y;
                    const relVelZ = b.vel.z - a.vel.z;
                    const velAlongNormal = relVelX * nx + relVelY * ny + relVelZ * nz;

                    if (velAlongNormal < 0) {
                        const jImpulse = -1.5 * velAlongNormal;
                        const impulseX = jImpulse * nx;
                        const impulseY = jImpulse * ny;
                        const impulseZ = jImpulse * nz;
                        
                        a.vel.x -= impulseX / a.mass;
                        a.vel.y -= impulseY / a.mass;
                        a.vel.z -= impulseZ / a.mass;
                        b.vel.x += impulseX / b.mass;
                        b.vel.y += impulseY / b.mass;
                        b.vel.z += impulseZ / b.mass;
                    }
                }
            }
        }
    }

    public reset(): void {
        this.currentAtomCount = 0;
    }

    public getAtoms(): Atom[] {
        return this.atoms.slice(0, this.currentAtomCount);
    }
}