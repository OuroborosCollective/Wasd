import * as CANNON from 'cannon-es';

export interface MovementInput {
    velocity: { x: number; y: number; z: number };
    position: { x: number; y: number; z: number };
    dt: number;
}

export interface ValidationResult {
    isValid: boolean;
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
}

export class HeadlessValidator {
    private world: CANNON.World;
    private players: Map<string, CANNON.Body> = new Map();
    private readonly MAX_DT = 0.1; // Max simulation step to prevent exploits
    private readonly TOLERANCE = 0.2; // Allowed deviation between client and server

    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.81, 0);
        
        // Default solver settings for stability
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
        this.world.defaultContactMaterial.contactEquationRelaxation = 4;

        // Ground Plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    /**
     * Registers a player body in the headless simulation.
     */
    public addPlayer(id: string, startPos: { x: number; y: number; z: number }): void {
        const shape = new CANNON.Sphere(0.5); // Player collision proxy
        const body = new CANNON.Body({
            mass: 1,
            shape: shape,
            position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
            fixedRotation: true,
            linearDamping: 0.01
        });
        this.world.addBody(body);
        this.players.set(id, body);
    }

    /**
     * Removes a player body.
     */
    public removePlayer(id: string): void {
        const body = this.players.get(id);
        if (body) {
            this.world.removeBody(body);
            this.players.delete(id);
        }
    }

    /**
     * Validates movement input from a client.
     * Checks if the reported position matches the server-side simulation.
     */
    public validateMovement(id: string, input: MovementInput): ValidationResult {
        const body = this.players.get(id);
        if (!body) {
            return { 
                isValid: false, 
                position: input.position, 
                velocity: input.velocity 
            };
        }

        // Apply client-side velocity as an impulse or direct velocity update
        // We trust the velocity input for the simulation, but check the resulting position
        body.velocity.set(input.velocity.x, input.velocity.y, input.velocity.z);

        // Limit DT to prevent huge jumps
        const dt = Math.min(input.dt, this.MAX_DT);

        // Step simulation for this specific entity frame
        // Note: In a more complex setup, we would step the entire world synchronously
        this.world.step(1 / 60, dt, 3);

        const serverPos = body.position;
        const clientPos = input.position;

        // Calculate Euclidean distance between server and client positions
        const distance = Math.sqrt(
            Math.pow(serverPos.x - clientPos.x, 2) +
            Math.pow(serverPos.y - clientPos.y, 2) +
            Math.pow(serverPos.z - clientPos.z, 2)
        );

        const isValid = distance <= this.TOLERANCE;

        // If invalid, the return values will be used for reconciliation (snapping the client back)
        return {
            isValid,
            position: { x: serverPos.x, y: serverPos.y, z: serverPos.z },
            velocity: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z }
        };
    }

    /**
     * Syncs static geometry from the game world to the headless simulation.
     */
    public addStaticBox(pos: { x: number, y: number, z: number }, size: { x: number, y: number, z: number }): void {
        const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
        const body = new CANNON.Body({
            mass: 0,
            position: new CANNON.Vec3(pos.x, pos.y, pos.z)
        });
        body.addShape(shape);
        this.world.addBody(body);
    }
}