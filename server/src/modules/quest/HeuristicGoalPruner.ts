// @ts-nocheck
export class HeuristicGoalPruner {
    private static readonly SCAN_RADIUS_SQ = 1600;

    public pruneByEchoIntensity(npc: any, activeBeacons: any[]): void {
        for (const beacon of activeBeacons) {
            const dx = npc.x - beacon.x;
            const dy = npc.y - beacon.y;
            const distSq = dx * dx + dy * dy;

            if (distSq <= HeuristicGoalPruner.SCAN_RADIUS_SQ && beacon.intensity >= 0.70) {
                npc.memory.longTermGoals = npc.memory.longTermGoals.filter((goal: any) => {
                    const isQuest = typeof goal.type === 'string' && goal.type.startsWith('quest_');
                    const isCombat = goal.type === 'combat' && beacon.intensity > 0.90;
                    return isQuest || isCombat;
                });

                npc.state = 'wandering';
                npc.stateTimer = Date.now() + 10000;
                return;
            }
        }
    }
}