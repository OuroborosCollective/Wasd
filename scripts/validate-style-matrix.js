const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../game-data/style-matrix');
let exitCode = 0;

function loadJSON(filename) {
    try {
        const fileContent = fs.readFileSync(path.join(dataDir, filename), 'utf8');
        return JSON.parse(fileContent);
    } catch (e) {
        console.error(`❌ Failed to load or parse ${filename}: ${e.message}`);
        exitCode = 1;
        return null;
    }
}

const biomes = loadJSON('biomes.json');
const history = loadJSON('history.json');
const factions = loadJSON('factions.json');
const conditions = loadJSON('conditions.json');

console.log("--- Style Matrix Validation ---");

if (!biomes || !history || !factions || !conditions) {
    console.error("❌ Critical files missing. Cannot proceed with validation.");
    process.exit(1);
}

// Basic validation rules
function checkKeysAndStructure(data, name, requiredFields) {
    console.log(`Checking ${name}...`);
    let count = 0;
    for (const key in data) {
        count++;
        const item = data[key];
        for (const field of requiredFields) {
            // Factions 'independent' can have null decal, need a loose check, but key must exist
            if (!(field in item)) {
                console.error(`  ❌ ${name} item '${key}' is missing required field: '${field}'`);
                exitCode = 1;
            }
        }
    }
    console.log(`  ✅ Loaded ${count} items for ${name}.`);
}

checkKeysAndStructure(biomes, 'Biomes', ['palette']);
checkKeysAndStructure(history, 'Historical Layers', ['materialModifier']);
checkKeysAndStructure(factions, 'Factions', ['decal']);
checkKeysAndStructure(conditions, 'Conditions', ['overlay', 'meshVariant']);

// Simulate testing a Style Key
function testKey(styleKey) {
    const parts = styleKey.split('_');
    if (parts.length !== 4) {
        console.error(`❌ Test key '${styleKey}' is malformed. Expected format: biome_history_faction_condition`);
        exitCode = 1;
        return;
    }

    const [biome, hist, faction, cond] = parts;

    let valid = true;
    if (!biomes[biome]) { console.error(`  ❌ Invalid biome: ${biome}`); valid = false; }
    if (!history[hist]) { console.error(`  ❌ Invalid history layer: ${hist}`); valid = false; }
    if (faction !== 'none' && !factions[faction]) { console.error(`  ❌ Invalid faction: ${faction}`); valid = false; }
    if (!conditions[cond]) { console.error(`  ❌ Invalid condition: ${cond}`); valid = false; }

    if (valid) {
        console.log(`  ✅ Test key '${styleKey}' is perfectly valid.`);
    } else {
        exitCode = 1;
    }
}

console.log("\nTesting Sample Style Keys:");
testKey('desert_ancient_redfalcon_ruined');
testKey('forest_recent_independent_clean');
testKey('swamp_classical_shadowregister_sacred');

console.log("\n-------------------------------");
if (exitCode === 0) {
    console.log("🎉 Style Matrix validation passed successfully!");
} else {
    console.error("💥 Style Matrix validation failed.");
}

process.exit(exitCode);
