import { SynergyRitualLogic } from "./SynergyRitualLogic";
import { ObjectPlacement, IPlacedObject } from "./ObjectPlacement";

export interface IBoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface IAgent {
    id: string;
    x: number;
    y: number;
    radius: number;
}

export class AgentManager {
    private agents: Map<string, IAgent> = new Map();
    private ritualLogic: SynergyRitualLogic;
    private objectPlacement: ObjectPlacement;
    private readonly detectionThreshold: number = 100;

    constructor(ritualLogic: SynergyRitualLogic, objectPlacement: ObjectPlacement) {
        this.ritualLogic = ritualLogic;
        this.objectPlacement = objectPlacement;
    }

    public addAgent(id: string, x: number, y: number, radius: number = 15): void {
        this.agents.set(id, { id, x, y, radius });
    }

    public updateAgentPosition(id: string, x: number, y: number): void {
        const agent = this.agents.get(id);
        if (!agent) return;

        agent.x = x;
        agent.y = y;

        this.processPhysicalInteractions(agent);
    }

    private processPhysicalInteractions(agent: IAgent): void {
        const boundingBox: IBoundingBox = {
            minX: agent.x - agent.radius,
            minY: agent.y - agent.radius,
            maxX: agent.x + agent.radius,
            maxY: agent.y + agent.radius
        };

        const nearbyObjects = this.objectPlacement.getObjects().filter(obj => {
            const dx = obj.x - agent.x;
            const dy = obj.y - agent.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance < this.detectionThreshold;
        });

        if (nearbyObjects.length > 0) {
            nearbyObjects.forEach(obj => {
                this.ritualLogic.reportPresence({
                    agentId: agent.id,
                    position: { x: agent.x, y: agent.y },
                    radius: agent.radius,
                    boundingBox: boundingBox,
                    targetObjectId: obj.id,
                    timestamp: Date.now()
                });
            });
        }
    }

    public getAgent(id: string): IAgent | undefined {
        return this.agents.get(id);
    }

    public removeAgent(id: string): void {
        this.agents.delete(id);
    }

    public getAllAgents(): IAgent[] {
        return Array.from(this.agents.values());
    }
}