export class Interpolation {
    /**
     * Lineare Interpolation zwischen zwei Werten oder Objekten/Arrays.
     * @param {number|number[]|object} current - Der aktuelle Wert.
     * @param {number|number[]|object} target - Der Zielwert.
     * @param {number} factor - Der Glättungsfaktor (0.0 bis 1.0).
     * @returns {number|number[]|object} Der interpolierte Wert.
     */
    static lerp(current, target, factor) {
        if (typeof current === 'number' && typeof target === 'number') {
            return current + (target - current) * factor;
        }

        if (Array.isArray(current) && Array.isArray(target)) {
            return current.map((val, index) => {
                const targetVal = target[index] !== undefined ? target[index] : val;
                return val + (targetVal - val) * factor;
            });
        }

        if (typeof current === 'object' && current !== null && typeof target === 'object' && target !== null) {
            const result = { ...current };
            for (const key in target) {
                if (Object.prototype.hasOwnProperty.call(target, key)) {
                    if (typeof current[key] === 'number' && typeof target[key] === 'number') {
                        result[key] = current[key] + (target[key] - current[key]) * factor;
                    } else if (typeof current[key] === 'object' && typeof target[key] === 'object') {
                        result[key] = Interpolation.lerp(current[key], target[key], factor);
                    } else {
                        result[key] = target[key];
                    }
                }
            }
            return result;
        }

        return target;
    }

    /**
     * Glättet AREPayload-spezifische Werte.
     * @param {object} currentPayload - Aktuelles AREPayload Objekt.
     * @param {object} targetPayload - Ziel AREPayload Objekt.
     * @param {number} factor - Der Glättungsfaktor.
     * @returns {object} Das geglättete AREPayload Objekt.
     */
    static smoothAREPayload(currentPayload, targetPayload, factor) {
        if (!currentPayload) return targetPayload;
        
        return {
            ...targetPayload,
            resonance: Interpolation.lerp(
                currentPayload.resonance || 0, 
                targetPayload.resonance || 0, 
                factor
            ),
            aggression: Interpolation.lerp(
                currentPayload.aggression || 0, 
                targetPayload.aggression || 0, 
                factor
            )
        };
    }
}