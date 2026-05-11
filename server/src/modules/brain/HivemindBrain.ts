import { HeuristicWorldBrain, BrainNode } from './HeuristicWorldBrain.js';

export class HivemindBrain {
    constructor(private worldBrain: HeuristicWorldBrain) {}

    checkSwarmPotential(): boolean {
        // Access the private nodes array by casting to any
        const nodes: BrainNode[] = (this.worldBrain as any).nodes;

        if (!nodes) return false;

        const socialTension = nodes.find(n => n.id === 'social_tension');
        const monsterActivity = nodes.find(n => n.id === 'monster_activity');

        if (socialTension && monsterActivity) {
            return socialTension.value > 0.8 && monsterActivity.value > 0.8;
        }

        return false;
    }
}
