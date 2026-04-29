class LoreEngine {
    constructor(worldSeed = 42) {
        this.worldSeed = worldSeed;
        this.tables = {
            prefixes: ["Aethel", "Drak", "Khor", "Zhul", "Oakhaven", "Iron", "Silver", "Shadow", "High", "Deep", "Grim", "Star", "Void", "Gold", "Storm"],
            suffixes: ["watch", "fell", "gard", "spire", "crag", "gate", "bridge", "wood", "mill", "keep", "reach", "mound", "hollow", "port", "stead"],
            biomes: {
                desert: { 
                    descriptors: ["scorched", "sandy", "dusty", "sun-baked", "arid"], 
                    sites: ["Oasis", "Dune", "Canyon", "Outpost", "Temple"] 
                },
                forest: { 
                    descriptors: ["verdant", "ancient", "shadowy", "overgrown", "silent"], 
                    sites: ["Grove", "Thicket", "Glade", "Shrine", "Camp"] 
                },
                mountain: { 
                    descriptors: ["frozen", "rugged", "lofty", "jagged", "clouded"], 
                    sites: ["Peak", "Pass", "Mine", "Stronghold", "Ridge"] 
                },
                tundra: { 
                    descriptors: ["icy", "bleak", "silent", "permafrosted", "wind-swept"], 
                    sites: ["Waste", "Vault", "Obelisk", "Burial", "Monolith"] 
                },
                ocean: { 
                    descriptors: ["sunken", "abyssal", "tidal", "coraline", "salt-crusted"], 
                    sites: ["Reef", "Wreck", "Abyss", "Platform", "Grotto"] 
                },
                plains: {
                    descriptors: ["grassy", "vast", "rolling", "windy", "fertile"],
                    sites: ["Farm", "Meadow", "Hill", "Mill", "Circle"]
                }
            },
            factions: {
                neutral: { 
                    traits: ["forgotten", "abandoned", "lawless", "mysterious"], 
                    events: ["a great battle occurred here", "a mysterious ritual was performed", "a traveler vanished without a trace", "ancient artifacts were unearthed"] 
                },
                empire: { 
                    traits: ["fortified", "imperial", "orderly", "taxed"], 
                    events: ["a tax revolt was suppressed", "a legendary commander was born here", "a strategic treaty was signed", "a grand parade was held"] 
                },
                syndicate: { 
                    traits: ["hidden", "corrupt", "shady", "profitable"], 
                    events: ["a secret deal was struck", "an assassination took place", "stolen goods were distributed", "a rival gang was eliminated"] 
                },
                guardians: {
                    traits: ["sacred", "protected", "vigilant", "hallowed"],
                    events: ["an ancient evil was sealed", "the first spark of magic was found", "a celestial alignment was observed", "the protectors swore their oath"]
                }
            }
        };
    }

    _seededRandom(seed) {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    _getSeed(x, y) {
        return (x * 73856093) ^ (y * 19349663) ^ this.worldSeed;
    }

    _pick(list, seed) {
        const index = Math.floor(this._seededRandom(seed) * list.length);
        return list[index];
    }

    generatePOI(x, y, biomeType, factionName = 'neutral') {
        const seed = this._getSeed(x, y);
        const biome = this.tables.biomes[biomeType] || this.tables.biomes.plains;
        const faction = this.tables.factions[factionName] || this.tables.factions.neutral;

        const namePrefix = this._pick(this.tables.prefixes, seed + 1);
        const nameSuffix = this._pick(this.tables.suffixes, seed + 2);
        const siteType = this._pick(biome.sites, seed + 3);
        
        const name = `${namePrefix}${nameSuffix} ${siteType}`;
        
        const descriptor = this._pick(biome.descriptors, seed + 4);
        const trait = this._pick(faction.traits, seed + 5);
        const event = this._pick(faction.events, seed + 6);
        
        const lore = `The ${name} is a ${descriptor} landmark within the territory of the ${factionName}. Records show it is ${trait}, primarily because ${event} in its long history. Travelers are advised to navigate the ${biomeType} terrain with caution near these coordinates.`;

        return {
            id: `poi_${x}_${y}`,
            name,
            lore,
            metadata: {
                coordinates: { x, y },
                biome: biomeType,
                faction: factionName,
                seed: seed
            }
        };
    }
}

export default LoreEngine;