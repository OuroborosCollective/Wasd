class TraitResonanceEngine {
    /**
     * Berechnet den Resonance_Score basierend auf den Stadtattributen.
     * Formel: (faith_avg * stability_factor) - (aggression * volatility_index)
     * 
     * @param {Object} traits - Die Eingabewerte für die Berechnung.
     * @param {number} traits.faith_avg - Durchschnittlicher Glaubenswert.
     * @param {number} traits.stability_factor - Stabilitätsfaktor.
     * @param {number} traits.aggression - Aggressionswert.
     * @param {number} traits.volatility_index - Volatilitätsindex.
     * @returns {number} Der berechnete Resonance_Score.
     */
    calculateResonanceScore({ faith_avg, stability_factor, aggression, volatility_index }) {
        return (faith_avg * stability_factor) - (aggression * volatility_index);
    }

    /**
     * Validiert, ob die Stadtplanung Stufe 4 freigeschaltet ist.
     * Bedingung: Score > 0.75
     * 
     * @param {number} score - Der berechnete Resonance_Score.
     * @returns {boolean} True, wenn Stufe 4 freigeschaltet ist.
     */
    validateUrbanPlanningLevel4(score) {
        const UNLOCK_THRESHOLD = 0.75;
        return score > UNLOCK_THRESHOLD;
    }

    /**
     * Führt die vollständige Bewertung der Trait-Resonanz aus.
     * 
     * @param {Object} data - Die Rohdaten der Stadt.
     * @returns {Object} Resultat der Berechnung und Validierung.
     */
    evaluateResonance(data) {
        const score = this.calculateResonanceScore(data);
        const level4Unlocked = this.validateUrbanPlanningLevel4(score);

        return {
            resonance_score: score,
            urban_planning_level_4_unlocked: level4Unlocked,
            timestamp: Date.now()
        };
    }
}

export default TraitResonanceEngine;