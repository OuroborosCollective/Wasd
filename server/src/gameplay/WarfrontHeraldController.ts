import { WorldEventBus } from "../events/WorldEventBus";
import { NPCManager } from "./NPCManager";
import { GameState } from "../core/GameState";

export class WarfrontHeraldController {
    private static readonly BOSS_ID = "warfront_herald";
    private static readonly BOSS_NAME = "Warfront Herald";
    private static readonly LEVEL = 52;
    private static readonly MAX_HP = 14000;

    constructor() {
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        WorldEventBus.getInstance().on("scarcity_event", (payload: any) => {
            this.handleScarcityEvent(payload);
        });
    }

    private handleScarcityEvent(payload: any): void {
        const regionId = payload.regionId || "central_warfront";
        this.spawnWarfrontHerald(regionId);
        this.startPvEEscalationPhase(regionId);
    }

    private spawnWarfrontHerald(regionId: string): void {
        const spawnConfig = {
            id: WarfrontHeraldController.BOSS_ID,
            name: WarfrontHeraldController.BOSS_NAME,
            level: WarfrontHeraldController.LEVEL,
            attributes: {
                hp: WarfrontHeraldController.MAX_HP,
                maxHp: WarfrontHeraldController.MAX_HP,
                defense: 450,
                attackPower: 850
            },
            position: this.calculateSpawnPosition(regionId),
            behavior: "AGGRESSIVE_ELITE",
            lootTable: "herald_war_spoils"
        };

        NPCManager.getInstance().spawnElite(spawnConfig);
        
        WorldEventBus.getInstance().emit("boss_spawned", {
            bossId: WarfrontHeraldController.BOSS_ID,
            regionId: regionId,
            timestamp: Date.now()
        });
    }

    private startPvEEscalationPhase(regionId: string): void {
        GameState.getInstance().setWorldPhase("PVE_ESCALATION");
        
        WorldEventBus.getInstance().emit("phase_changed", {
            newPhase: "PVE_ESCALATION",
            intensity: 1.5,
            regionId: regionId,
            buffs: ["WAR_FURY", "HERALDS_PRESENCE"]
        });

        this.activateEscalationMechanics();
    }

    private activateEscalationMechanics(): void {
        NPCManager.getInstance().setGlobalAggroMultiplier(1.25);
        NPCManager.getInstance().increaseSpawnRate(regionId => regionId === "central_warfront", 2.0);
    }

    private calculateSpawnPosition(regionId: string): { x: number, y: number, z: number } {
        return { x: 1240.5, y: 45.0, z: -890.2 };
    }
}

export const warfrontHeraldController = new WarfrontHeraldController();