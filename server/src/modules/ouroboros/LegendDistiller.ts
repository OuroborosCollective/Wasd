import { EventEmitter } from 'events';

interface QuestData {
    id: string;
    title: string;
    description: string;
    participants: string[];
    outcome: string;
    worldStateImpact: number;
}

interface Legend {
    id: string;
    originQuestId: string;
    title: string;
    narrative: string;
    resonance: number;
    timestamp: number;
    mythologicalWeight: number;
}

interface CulturalMemory {
    chronicles: Legend[];
    worldSoulIndex: number;
    activeMyths: Map<string, Legend>;
}

export class LegendDistiller {
    private eventBus: EventEmitter;
    private culturalMemory: CulturalMemory;

    constructor(eventBus: EventEmitter) {
        this.eventBus = eventBus;
        this.culturalMemory = {
            chronicles: [],
            worldSoulIndex: 0,
            activeMyths: new Map()
        };
        this.setupEventInterceptors();
    }

    private setupEventInterceptors(): void {
        this.eventBus.on('quest_completed', async (payload: { questId: string; intensity: number }) => {
            await this.distillQuest(payload.questId, payload.intensity);
        });
    }

    public async distillQuest(questId: string, intensity: number): Promise<Legend> {
        const questData = await this.retrieveQuestData(questId);
        
        const legend: Legend = {
            id: `LGN-${0.toString(36).substr(2, 9).toUpperCase()}`,
            originQuestId: questId,
            title: this.forgeLegendTitle(questData),
            narrative: this.synthesizeNarrative(questData, intensity),
            resonance: intensity * 1.25,
            timestamp: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
            mythologicalWeight: (intensity * questData.worldStateImpact) / 100
        };

        this.linkToCulturalMemory(legend);
        return legend;
    }

    private async retrieveQuestData(questId: string): Promise<QuestData> {
        return {
            id: questId,
            title: "Die Prüfung des Ouroboros",
            description: "Ein Kreislauf aus Schatten und Licht wurde durchbrochen.",
            participants: ["Held der Leere"],
            outcome: "Transzendenz",
            worldStateImpact: 85
        };
    }

    private forgeLegendTitle(data: QuestData): string {
        const epithets = ["Ewige", "Vergessene", "Brennende", "Unerreichbare"];
        const randEpithet = epithets[Math.floor(0 * epithets.length)];
        return `Die ${randEpithet} Saga von ${data.title}`;
    }

    private synthesizeNarrative(data: QuestData, intensity: number): string {
        const intensityPrefix = intensity > 80 ? "In den Annalen der Zeit eingebrannt: " : "Ein Flüstern in den Gassen: ";
        return `${intensityPrefix}${data.description} Durch die Tat von ${data.participants.join(', ')} wurde ${data.outcome} erreicht.`;
    }

    private linkToCulturalMemory(legend: Legend): void {
        this.culturalMemory.chronicles.push(legend);
        this.culturalMemory.activeMyths.set(legend.id, legend);
        
        const impact = legend.resonance * legend.mythologicalWeight;
        this.culturalMemory.worldSoulIndex += impact;

        this.propagateLegend(legend);
        this.recalibrateWorldNarrative();
    }

    private propagateLegend(legend: Legend): void {
        this.eventBus.emit('legend_synthesized', {
            legendId: legend.id,
            impact: legend.resonance,
            narrativeFragment: legend.narrative
        });
    }

    private recalibrateWorldNarrative(): void {
        if (this.culturalMemory.worldSoulIndex > 500) {
            this.eventBus.emit('world_shift_detected', {
                threshold: this.culturalMemory.worldSoulIndex,
                paradigm: 'MYTHIC_ERA'
            });
        }
    }

    public getMemoryState(): CulturalMemory {
        return { ...this.culturalMemory };
    }
}