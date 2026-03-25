# Procedural Style Matrix

## A. Purpose
The Procedural Style Matrix is a lightweight, data-friendly visual styling system for world generation in Arelorian. Its primary goal is to act as an automated Art Director. It provides rules for creating visual variety (textures, colors, patterns, and wear) across a massive, procedurally generated world without requiring thousands of unique, heavy assets.

The project needs this matrix to ensure the world remains visually rich and structured while preserving the strict performance requirements of a persistent browser MMORPG. By defining a set of constraints and reusable asset pipelines, we ensure that chunk streaming remains fast and memory usage stays low.

## B. Design Principles
*   **Performance-first:** Avoid unique textures or high-poly models for every object. Rely on small texture atlases, vertex colors, and simple decals.
*   **Reuse-first:** A single base mesh (e.g., a "stone wall" or "basic house") must be reusable across multiple biomes and historical eras simply by changing its style parameters.
*   **World readability:** Players should be able to instantly recognize the history, faction, and biome of a location just by looking at its color palette, patterns, and state of decay.
*   **Data-driven visual identity:** Visual styles are not hardcoded into assets. They are generated dynamically at chunk creation based on a reproducible "Style Key."

## C. Style Axes
The visual identity of any object or chunk is determined by four main axes:

1.  **Biome:** The geographical location (e.g., Desert, Forest, Swamp, Tundra, Volcanic). Dictates base color palettes and primary materials (sandstone vs. wood vs. mud).
2.  **Historical Layer / Age:** The era the object originates from (e.g., Ancient, Classical, Recent, Current). Dictates structural shape language (ruined columns vs. intact timber frames) and color saturation (faded vs. vibrant).
3.  **Faction / Civilization:** The cultural or political owner (e.g., Red Falcon House, Sun Order, Shadow Register, Independent). Dictates symbol decals, specific accent colors (e.g., crimson banners), and architectural motifs.
4.  **Condition / State:** The current physical status of the object/area. Examples include:
    *   `clean`: Well-maintained, vibrant colors.
    *   `worn`: Faded colors, minor edge wear (noise patterns).
    *   `ruined`: Broken geometry (swapped mesh variant), heavy dirt/moss overlay.
    *   `sacred`: Glowing runes, pristine state despite age, specific lighting.
    *   `militarized`: Fortified additions (spikes, barricades), starker contrast.

## D. Asset Classes
Terrain remains primarily logic/material-based. GLB (3D model) usage is strictly categorized:

*   **Vegetation (Trees, Bushes, Grass):** Low-poly planes or simple clusters. Style variation comes from tinting (vertex colors based on biome/season) and scale.
*   **Rocks / Boulders:** Generic, chunky shapes. Variation comes from biome material (sandstone vs. obsidian) and moss/snow coverage (Condition axis).
*   **Buildings (Houses, Shops, Guilds):** Modular or simple distinct shapes. Reused heavily. Variation via Biome material swapping, Faction decals (banners/signs), and Condition (clean vs. worn).
*   **Ruins:** Specific broken meshes. Variation primarily driven by Historical Layer (determines base shape) and Biome (determines material).
*   **Props (Crates, Barrels, Wagons):** Very low-poly scatter objects. Shared atlas textures. Rarely altered by Style Key unless Faction-specific (e.g., a supply crate with a faction logo).
*   **Faction/Civilization Markings (Banners, Shields, Statues):** Distinct objects or decals applied to Buildings/Ruins. Highly dependent on the Faction axis.
*   **Gates / Landmarks:** Unique, slightly higher-poly focal points for chunk navigation. Style Key dictates their current state (e.g., an ancient, ruined gate vs. a newly built, militarized gate).
*   **Dungeon Modules:** Modular interior blocks. Style driven heavily by Historical Layer and Faction (who built the dungeon) and Condition (ruined vs. sacred).

## E. Production Budgets
To maintain browser MMORPG performance, all assets must strictly adhere to these guidelines:

*   **Polygon Budgets:**
    *   Props/Scatter: 50 - 200 tris
    *   Vegetation: 100 - 500 tris
    *   Rocks: 100 - 400 tris
    *   Standard Buildings/Ruins: 500 - 1,500 tris
    *   Landmarks/Gates: 1,500 - 3,000 tris (Max)
*   **Recommended Texture Sizes:**
    *   Standard maximum is 512x512.
    *   Important landmarks or large atlases may use 1024x1024.
*   **Atlas Guidance:** Combine textures for entire asset classes into a single atlas (e.g., one 1024x1024 atlas for all "Wood and Stone Props").
*   **Vertex Color Guidance:** Strongly encouraged for tinting base meshes (e.g., tinting tree leaves for autumn, or tinting a generic rock mesh to match the desert sand). This avoids needing unique textures per biome.
*   **Decal/Pattern Guidance:** Use small, reusable alpha textures (128x128 or 256x256) for Faction symbols, dirt patches, or moss. Project these onto base meshes via shader logic or secondary UV channels.
*   **Mesh Variation vs. Material/Color:** Rely on material/color variation 90% of the time. Only create a new mesh variant if the structural silhouette significantly changes (e.g., an intact wall vs. a broken wall).

## F. Style Key System
To avoid recalculating styles endlessly at runtime, the world generation logic generates a reproducible "Style Key" for objects or chunks upon creation. This key is a simple string that drives the visual setup.

**Structure:** `[Biome]_[HistoricalLayer]_[Faction]_[Condition]`

**Examples:**
*   `desert_ancient_redfalcon_ruined`
*   `forest_current_sunorder_clean`
*   `swamp_classical_shadowregister_sacred`
*   `tundra_recent_independent_militarized`

**How it drives visuals:**
When the engine loads a `building_base_01.glb` with the key `desert_ancient_redfalcon_ruined`:
1.  **Palette:** Loads the "Desert" color palette (warm yellows, terracottas).
2.  **Material Variant:** Applies a faded, desaturated "Ancient" material multiplier.
3.  **Decal Choice:** Projects a faded "Red Falcon" emblem onto a designated decal slot.
4.  **Condition/Wear:** Applies a heavy "dirt/sand" noise pattern overlay over the base texture, and potentially selects the `_broken` mesh variant if available.

## G. Example Combinations

### Example 1: `desert_ancient_redfalcon_ruined`
*   **Likely Color Palette:** Faded sandstone yellows, bleached terracotta, sun-bleached crimson (for the faction).
*   **Likely Materials:** Rough, non-reflective stone, dry sand accumulation.
*   **Likely Patterns/Decals:** Heavily faded and scratched Red Falcon emblem, wind-eroded striation patterns.
*   **Likely Mesh Language:** Blocky, eroded shapes; missing roof sections; half-buried in terrain.
*   **Likely Asset Mood:** Desolate, forgotten glory, harsh environment.

### Example 2: `forest_recent_hunterlodge_militarized`
*   **Likely Color Palette:** Deep greens, rich browns, sharp iron greys.
*   **Likely Materials:** Sturdy timber, reinforced iron banding, fresh mud.
*   **Likely Patterns/Decals:** Sharp, clear Hunter Lodge insignia (e.g., crossed arrows); minimal wear.
*   **Likely Mesh Language:** Practical, defensive structures; added wooden spikes, barricades, and watchtowers over standard building meshes.
*   **Likely Asset Mood:** Tense, practical, defensive, active.

### Example 3: `swamp_classical_shadowregister_sacred`
*   **Likely Color Palette:** Dark mossy greens, obsidian blacks, glowing ethereal purples/blues.
*   **Likely Materials:** Slick, wet stone; bioluminescent accents.
*   **Likely Patterns/Decals:** Shadow Register runes (glowing), heavy hanging moss decals.
*   **Likely Mesh Language:** Elegant but unsettling monolithic structures; unnaturally intact despite the swamp environment.
*   **Likely Asset Mood:** Mysterious, unsettling, magically potent, ancient but active.

## H. Performance Rationale
This system is critical for a browser-based MMORPG because:
*   **Chunk Streaming:** Sending a Style Key string (`desert_ancient_redfalcon_ruined`) over the network takes mere bytes, compared to downloading a unique 2MB model/texture combo for every building. The browser reuses cached base models and texture atlases.
*   **Memory Efficiency:** The GPU only needs to hold a few master atlases and palettes in memory. Variation is achieved via cheap shader math (vertex colors, tinting, simple noise overlays) rather than unique heavy textures.
*   **World Logic Alignment:** The visuals are a direct 1:1 reflection of the underlying simulation (the Ouroboros cycle, Civilizations, etc.). The logic drives the string, the string drives the shader.
*   **Asset Reuse:** Artists don't need to model a "Desert Ruin" and a "Forest Ruin". They model a "Ruin" and let the Style Matrix handle the rest.

## I. Production Rules for Future Creators

**For 3D Artists:**
*   **DO NOT** bake lighting, dirt, or specific biome colors into your base textures. Keep base textures neutral and clean.
*   **DO** rely heavily on vertex coloring for ambient occlusion or base tinting areas.
*   **DO** set up secondary UV channels or designated material slots specifically for decals (faction symbols) and procedural wear (dirt/moss).
*   **DO NOT** exceed the polygon budgets listed in Section E.
*   **DO** build modularly.

**For No-Code / Content Agents:**
*   When defining new biomes or factions in JSON data, you **must** define their corresponding Style Matrix data (color palettes, preferred decals).
*   Do not invent new visual categories outside the 4 main axes unless absolutely necessary.
*   Use existing base meshes whenever possible and rely on the Style Key to create a new feeling.

## J. Optional Future Extensions
*   **Dynamic Weather Wear:** Expanding the `Condition` axis temporarily based on weather (e.g., a `wet` overlay during rain).
*   **Material Economy Link:** Tying the visual material of a building directly to the exact resources used to craft it by players (e.g., Pine Wood vs. Oak Wood variations of the same building base).
