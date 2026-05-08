import { NPC } from '../npc/NPC';
import { Chunk } from '../world/Chunk';
import { GuildSovereigntyEngine } from '../guild/GuildSovereigntyEngine';

interface ResonanceResult {
    faith: number;
    aggression: number;
}

export class TraitResonanceEngine {
    private resonanceMap = new Map<string, ResonanceResult>();
    
    constructor(private readonly sovereigntyEngine: GuildSovereigntyEngine) {}

    /**
     * Berechnet den Durchschnitt der Aggression innerhalb eines Chunks unter Berücksichtigung
     * der Gilden-Souveränität. Ein hoher Kontrollgrad einer Gilde senkt die effektive
     * Aggressions-Resonanz und damit die atmosphärische Spannung (Ambient Tension).
     */
    public calculateChunkAggressionAvg(chunk: Chunk, npcs: NPC[]): number {
        if (!npcs || npcs.length === 0) {
            return 0;
        }

        // 1. Basis-Aggression aller NPCs im Chunk summieren
        const totalAggression = npcs.reduce((sum, npc) => {
            const aggression = npc.traits?.aggression ?? 0;
            return sum + aggression;
        }, 0);

        const baseAvg = totalAggression / npcs.length;

        // 2. Einfluss der Guild Sovereignty Engine abrufen
        // Ein Wert zwischen 0 (keine Kontrolle) und 1 (maximale Kontrolle/Sicherheit)
        const mitigationFactor = this.sovereigntyEngine.getAggressionMitigationFactor(chunk.id);

        // 3. Aggressions-Durchschnitt anpassen
        // Die Reduktion sorgt dafür, dass visuelle/akustische Effekte in kontrollierten Gebieten subtiler sind
        const adjustedAvg = baseAvg * (1 - mitigationFactor);

        return Math.max(0, Math.min(1, adjustedAvg));
    }

    /**
     * Ermittelt den Resonanz-Wert für Umgebungs-Effekte.
     * Höhere Werte triggern aggressivere Shader-Parameter oder intensivere Audio-Loops.
     */
    public getAmbientTension(chunk: Chunk, npcs: NPC[]): number {
        const aggressionAvg = this.calculateChunkAggressionAvg(chunk, npcs);
        
        // Logik für zusätzliche Resonanz-Modifier (z.B. Wetter, Zeit) kann hier erweitert werden
        return aggressionAvg;
    }

    // Stub methods needed by WorldTick
    public getChunkKey(x: number, y: number): string {
        const chunkSize = 100;
        return `${Math.floor(x / chunkSize)}_${Math.floor(y / chunkSize)}`;
    }
    
    public getResonance(chunkKey: string): ResonanceResult {
        return this.resonanceMap.get(chunkKey) ?? { faith: 0.5, aggression: 0.5 };
    }
    
    public getAllResonance(): Map<string, ResonanceResult> {
        return this.resonanceMap;
    }
}