import { INPC, NPCState, LongTermGoal } from "./NPCInterfaces.js";
import type { IPathfindingSystem } from "../systems/PathfindingSystem.js";
import { CaravanLogic } from "./CaravanLogic.js";

export class TradeAIBehavior {
    private npc: INPC;
    private pathfinding: IPathfindingSystem;
    private caravanLogic: CaravanLogic;

    constructor(npc: INPC, pathfinding: IPathfindingSystem, caravanLogic: CaravanLogic) {
        this.npc = npc;
        this.pathfinding = pathfinding;
        this.caravanLogic = caravanLogic;
    }

    public update(): void {
        this.processLongTermGoals();
    }

    private processLongTermGoals(): void {
        if (this.npc.longTermGoal === "find_trade_partner") {
            this.handleTradeRouteFormation();
        }
    }

    private handleTradeRouteFormation(): void {
        const targetPosition = this.caravanLogic.targetPosition;

        if (!targetPosition) {
            return;
        }

        if (this.npc.state !== "TRAVELING_TO_MARKET") {
            this.npc.state = "TRAVELING_TO_MARKET";
        }

        const isMoving = this.pathfinding.isEntityMoving(this.npc.id);
        const currentTarget = this.pathfinding.getActiveDestination(this.npc.id);

        if (!isMoving || (currentTarget && !currentTarget.equals(targetPosition))) {
            this.pathfinding.setTarget(this.npc.id, targetPosition, {
                precision: 1.5,
                onPathStuck: () => this.handleNavigationStuck()
            });
        }
    }

    private handleNavigationStuck(): void {
        this.caravanLogic.recalculateRoute();
    }
}