class ProceduralLootFactory {
    constructor(db) {
        this.db = db;
        this.rarityTiers = [
            { id: 'COMMON', weight: 1000, mfMultiplier: 0, minAffixes: 0, maxAffixes: 0, color: '#9da1aa' },
            { id: 'MAGIC', weight: 200, mfMultiplier: 1.5, minAffixes: 1, maxAffixes: 2, color: '#3498db' },
            { id: 'RARE', weight: 60, mfMultiplier: 2.2, minAffixes: 3, maxAffixes: 4, color: '#f1c40f' },
            { id: 'EPIC', weight: 15, mfMultiplier: 3.5, minAffixes: 5, maxAffixes: 5, color: '#9b59b6' },
            { id: 'LEGENDARY', weight: 4, mfMultiplier: 5.0, minAffixes: 6, maxAffixes: 8, color: '#e67e22' }
        ];
    }

    async generateLoot(playerId, areaLevel) {
        const playerStats = await this.db.models.PlayerStats.findOne({ playerId });
        const magicFind = playerStats ? playerStats.magicFind : 0;

        const rarity = this._calculateRarity(magicFind);
        const baseItem = await this._getRandomBaseItem(areaLevel);
        const affixes = await this._generateAffixes(rarity, areaLevel);

        return {
            uid: this._generateUUID(),
            name: this._constructItemName(baseItem, affixes, rarity),
            baseType: baseItem.type,
            rarity: rarity.id,
            itemLevel: areaLevel,
            attributes: this._mergeAttributes(baseItem.baseStats, affixes),
            requirements: {
                level: Math.max(1, areaLevel - 5),
                strength: baseItem.reqStr || 0,
                intelligence: baseItem.reqInt || 0
            },
            visuals: {
                icon: baseItem.icon,
                color: rarity.color
            },
            sellValue: this._calculateValue(rarity, areaLevel, affixes.length)
        };
    }

    _calculateRarity(magicFind) {
        const mfEffect = magicFind / 100;
        
        const weightedTiers = this.rarityTiers.map(tier => {
            let adjustedWeight = tier.weight;
            if (tier.id !== 'COMMON') {
                adjustedWeight = tier.weight * (1 + (mfEffect * tier.mfMultiplier));
            }
            return { ...tier, adjustedWeight };
        });

        const totalWeight = weightedTiers.reduce((sum, t) => sum + t.adjustedWeight, 0);
        let roll = Math.random() * totalWeight;

        for (const tier of weightedTiers) {
            if (roll < tier.adjustedWeight) return tier;
            roll -= tier.adjustedWeight;
        }
        return weightedTiers[0];
    }

    async _getRandomBaseItem(areaLevel) {
        const bases = await this.db.models.ItemBase.find({ 
            minLevel: { $lte: areaLevel },
            maxLevel: { $gte: areaLevel }
        });
        return bases[Math.floor(Math.random() * bases.length)];
    }

    async _generateAffixes(rarity, areaLevel) {
        const affixCount = Math.floor(Math.random() * (rarity.maxAffixes - rarity.minAffixes + 1)) + rarity.minAffixes;
        if (affixCount <= 0) return [];

        const availableAffixes = await this.db.models.AffixPool.find({
            requiredLevel: { $lte: areaLevel }
        });

        const selectedAffixes = [];
        const pool = [...availableAffixes];

        for (let i = 0; i < affixCount; i++) {
            if (pool.length === 0) break;
            const index = Math.floor(Math.random() * pool.length);
            const affix = pool.splice(index, 1)[0];
            
            const scale = 1 + (areaLevel * 0.1);
            const roll = Math.random() * (affix.maxRoll - affix.minRoll) + affix.minRoll;
            
            selectedAffixes.push({
                name: affix.name,
                type: affix.type,
                stat: affix.stat,
                value: Math.round(roll * scale),
                isPrefix: affix.isPrefix
            });
        }
        return selectedAffixes;
    }

    _mergeAttributes(baseStats, affixes) {
        const stats = { ...baseStats };
        affixes.forEach(affix => {
            if (stats[affix.stat]) {
                stats[affix.stat] += affix.value;
            } else {
                stats[affix.stat] = affix.value;
            }
        });
        return stats;
    }

    _constructItemName(baseItem, affixes, rarity) {
        if (rarity.id === 'COMMON') return baseItem.name;

        const prefix = affixes.find(a => a.isPrefix)?.name || "";
        const suffix = affixes.find(a => !a.isPrefix)?.name || "";
        
        let name = baseItem.name;
        if (prefix) name = `${prefix} ${name}`;
        if (suffix) name = `${name} of ${suffix}`;

        return name;
    }

    _calculateValue(rarity, level, affixCount) {
        const baseValue = level * 10;
        const rarityMult = { 'COMMON': 1, 'MAGIC': 3, 'RARE': 8, 'EPIC': 20, 'LEGENDARY': 100 };
        return Math.round(baseValue * (rarityMult[rarity.id] || 1) * (1 + (affixCount * 0.2)));
    }

    _generateUUID() {
        return 'item-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

module.exports = ProceduralLootFactory;