// @ts-nocheck
import { PlexityEngine } from "../engine/PlexityEngine";
import { Engine } from "../../core/Engine";

export interface KappaPos {
    x: number;
    y: number;
}

export interface AREPayload {
    resonance: number;
    phaseShift: number;
    plexity: any;
}

export function processHazardResonance(player: any, hazardSource: KappaPos): Partial<AREPayload> {
    const dx = player.pos.x - hazardSource.x;
    const dy = player.pos.y - hazardSource.y;
    const distSq = dx * dx + dy * dy;

    let intensity = 0;

    if (distSq < 1600) {
        intensity = Math.floor(2000 / (distSq + 1));
        player.health -= (intensity * 0.01);
    }

    const plexity = PlexityEngine.calculate(player, hazardSource);
    const tickCount = Engine.tickCount;

    return {
        resonance: intensity,
        phaseShift: tickCount % 100,
        plexity: plexity
    };
}