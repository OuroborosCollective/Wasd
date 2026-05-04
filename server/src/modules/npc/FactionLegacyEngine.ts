// @ts-nocheck
import { NPCGenealogyEngine } from './NPCGenealogyEngine';
import { WorldHistory } from '../history/WorldHistory';

export interface INPCStats {
    faith: number;
    aggression: number;
    [key: string]: number;
}

export class FactionLegacyEngine extends NPCGenealogyEngine {
    private worldHistory: WorldHistory;

    constructor(worldHistory: WorldHistory) {
        super();
        this.worldHistory = worldHistory;
    }

    public generateLegacyStats(factionId: string, baseStats: INPCStats): INPCStats {
        const stats: INPCStats = { ...baseStats };
        const legends = this.worldHistory.getLegendsByFaction(factionId) || [];

        legends.forEach((legend) => {
            switch (legend.type) {
                case 'HEROIC_VICTORY':
                    stats.aggression += 0.15;
                    break;
                case 'DIVINE_INTERVENTION':
                    stats.faith += 0.25;
                    break;
                case 'GREAT_BETRAYAL':
                    stats.faith -= 0.20;
                    stats.aggression += 0.10;
                    break;
                default:
                    break;
            }
        });

        // Ensure stats remain within reasonable bounds if necessary
        stats.faith = Math.max(0, stats.faith);
        stats.aggression = Math.max(0, stats.aggression);

        return stats;
    }
}