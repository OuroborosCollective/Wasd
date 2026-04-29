export class FactionEngine {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.terrainMultipliers = {
            'mountain': { gold: 2.5, mana: 1.2, food: 0.1, friction: 1.5 },
            'forest': { gold: 0.5, mana: 1.8, food: 1.2, friction: 1.2 },
            'plains': { gold: 1.0, mana: 0.8, food: 2.5, friction: 1.0 },
            'water': { gold: 0.3, mana: 1.5, food: 1.8, friction: 1.1 },
            'desert': { gold: 1.8, mana: 0.4, food: 0.2, friction: 1.3 },
            'swamp': { gold: 0.4, mana: 2.0, food: 0.6, friction: 1.6 }
        };
    }

    calculateInfluenceMap(factions, grid) {
        const map = Array.from({ length: this.gridSize }, () => 
            Array.from({ length: this.gridSize }, () => ({ factionId: null, strength: 0 }))
        );

        factions.forEach(faction => {
            const { x, y, power, expansionRate } = faction;
            const maxRadius = Math.ceil(power * expansionRate);

            for (let i = Math.max(0, x - maxRadius); i < Math.min(this.gridSize, x + maxRadius); i++) {
                for (let j = Math.max(0, y - maxRadius); j < Math.min(this.gridSize, y + maxRadius); j++) {
                    const distance = Math.sqrt(Math.pow(x - i, 2) + Math.pow(y - j, 2));
                    const terrain = grid[i][j];
                    const friction = this.terrainMultipliers[terrain.type]?.friction || 1.0;
                    
                    const effectiveDistance = distance * friction;
                    if (effectiveDistance <= maxRadius) {
                        const strength = (1 - effectiveDistance / maxRadius) * power;
                        if (strength > map[i][j].strength) {
                            map[i][j] = { factionId: faction.id, strength: strength };
                        }
                    }
                }
            }
        });

        return map;
    }

    calculateTotalYield(factionId, influenceMap, grid, leylineNodes) {
        const totalYield = { gold: 0, mana: 0, food: 0 };

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const cellInfluence = influenceMap[x][y];
                
                if (cellInfluence.factionId === factionId) {
                    const terrain = grid[x][y];
                    const multipliers = this.terrainMultipliers[terrain.type] || { gold: 1, mana: 1, food: 1 };
                    const strengthFactor = cellInfluence.strength;

                    // Standard resource calculation
                    totalYield.gold += multipliers.gold * strengthFactor;
                    totalYield.food += multipliers.food * strengthFactor;

                    // Mana calculation with Leyline Proximity
                    let leylineMultiplier = 1.0;
                    leylineNodes.forEach(node => {
                        const dist = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
                        if (dist <= node.influenceRadius) {
                            const nodeEffect = (1 - dist / node.influenceRadius) * node.intensity;
                            leylineMultiplier += nodeEffect;
                        }
                    });

                    totalYield.mana += multipliers.mana * strengthFactor * leylineMultiplier;
                }
            }
        }

        return {
            gold: Math.floor(totalYield.gold),
            mana: Math.floor(totalYield.mana),
            food: Math.floor(totalYield.food)
        };
    }

    getDominantFactionAt(x, y, influenceMap) {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return null;
        return influenceMap[x][y].factionId;
    }

    applyResourceBonus(resources, factionTraits) {
        const modified = { ...resources };
        if (factionTraits.industrious) modified.gold *= 1.2;
        if (factionTraits.magical) modified.mana *= 1.3;
        if (factionTraits.agrarian) modified.food *= 1.2;
        return modified;
    }
}