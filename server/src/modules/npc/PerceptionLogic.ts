// @ts-nocheck
export function checkStealthDeterministic(npc: any, player: any): boolean {
    const dx = npc.kappaPos.x - player.kappaPos.x;
    const dy = npc.kappaPos.y - player.kappaPos.y;
    const distSq = dx * dx + dy * dy;
    const visibilityThreshold = 225 * (1.0 + npc.phaseShift / 1000);
    return distSq < visibilityThreshold;
}