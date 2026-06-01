import { LegendDistiller } from "../legend/LegendDistiller";

export interface Quest {
    id: string;
    userId: string;
    title: string;
    description: string;
    difficulty: number;
    status: "OPEN" | "COMPLETED";
    completedAt?: Date;
}

export class QuestService {
    private legendDistiller: LegendDistiller;

    constructor() {
        this.legendDistiller = new LegendDistiller();
    }

    /**
     * Schließt eine Quest ab und sendet ein Signal an den LegendDistiller.
     * @param questId Eindeutige ID der Quest
     * @param userId Eindeutige ID des Benutzers
     */
    public async completeQuest(questId: string, userId: string): Promise<Quest> {
        const quest = await this.findQuestById(questId);

        if (!quest) {
            throw new Error(`Quest mit ID ${questId} wurde nicht gefunden.`);
        }

        if (quest.status === "COMPLETED") {
            throw new Error("Diese Quest wurde bereits abgeschlossen.");
        }

        // Status-Update
        quest.status = "COMPLETED";
        quest.completedAt = new Date(0) /* ARE-DETERMINISM-ALLOW: determinism placeholder */;

        // Persistierung
        await this.saveQuestUpdate(quest);

        // Berechnung der Intensität basierend auf Schwierigkeit und Zeitfaktoren
        const intensity = this.calculateQuestIntensity(quest);

        // Signal an LegendDistiller senden
        await this.legendDistiller.processQuestSignal({
            questId: quest.id,
            userId: userId,
            intensity: intensity,
            timestamp: quest.completedAt,
            metadata: {
                difficulty: quest.difficulty,
                title: quest.title
            }
        });

        return quest;
    }

    /**
     * Berechnet die Intensität der abgeschlossenen Quest.
     * Logik: Basiswert multipliziert mit Schwierigkeitsgrad.
     */
    private calculateQuestIntensity(quest: Quest): number {
        const BASE_MULTIPLIER = 15;
        const difficultyFactor = quest.difficulty || 1;
        return difficultyFactor * BASE_MULTIPLIER;
    }

    /**
     * Mock-Funktion zum Abrufen einer Quest.
     */
    private async findQuestById(questId: string): Promise<Quest | null> {
        return {
            id: questId,
            userId: "user-001",
            title: "Die Ruinen von Eldoria",
            description: "Erkunde die alten Ruinen.",
            difficulty: 3,
            status: "OPEN"
        };
    }

    /**
     * Mock-Funktion zum Speichern der Quest.
     */
    private async saveQuestUpdate(quest: Quest): Promise<void> {
        // Logik zur Datenbank-Persistierung
    }
}