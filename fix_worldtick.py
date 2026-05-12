import re

with open('server/src/core/WorldTick.ts', 'r') as f:
    content = f.read()

# Add missing imports
imports_to_add = """
import { AssetPoolResolver } from "../modules/world/AssetPoolResolver.js";
import { ResourceSystem } from "../modules/world/ResourceSystem.js";
import { ChatSystem } from "../modules/chat/ChatSystem.js";
import { CraftingSystem } from "../modules/crafting/CraftingSystem.js";
import { SkillSystem } from "../modules/skill/SkillSystem.js";
import { LootSystem } from "../modules/loot/LootSystem.js";
import { GameConfig } from "../config/GameConfig.js";
import { characterAssembly } from "../modules/character/CharacterAssemblySystem.js";
"""

if 'import { AssetPoolResolver }' not in content:
    content = content.replace('import { GameWebSocketServer }', imports_to_add + '\nimport { GameWebSocketServer }')

# Add missing properties
props_to_add = """
  public assetPoolResolver: AssetPoolResolver;
  public resourceSystem: ResourceSystem;
  public chatSystem: ChatSystem;
  public craftingSystem: CraftingSystem;
  public skillSystem: SkillSystem;
  public lootSystem: LootSystem;
  public placementEngine: WorldPlacementRuleEngine;
  private worldState: any = { customDialogues: {}, nations: [], diplomacy: [], territories: {}, bannedPlayers: [], mutedPlayers: [] };
  private playerToSocket: Map<string, string> = new Map();
  private keysDown: Map<string, Set<string>> = new Map();
  private npcRespawnTimers: Map<string, any> = new Map();
"""

if 'public assetPoolResolver: AssetPoolResolver;' not in content:
    content = content.replace('public glbRegistry: GLBRegistry;', 'public glbRegistry: GLBRegistry;' + props_to_add)

# Initialize in constructor
inits_to_add = """
    this.assetPoolResolver = new AssetPoolResolver();
    this.resourceSystem = new ResourceSystem();
    this.chatSystem = new ChatSystem();
    this.craftingSystem = new CraftingSystem();
    this.skillSystem = new SkillSystem();
    this.lootSystem = new LootSystem();
    this.placementEngine = new WorldPlacementRuleEngine();
"""

if 'this.assetPoolResolver = new AssetPoolResolver();' not in content:
    content = content.replace('this.glbRegistry = new GLBRegistry();', 'this.glbRegistry = new GLBRegistry();' + inits_to_add)

# Add missing methods
methods_to_add = """
  public getPersistenceStats() {
    return {
      driver: this.persistence.getDriverName(),
      status: "active"
    };
  }

  private debouncedSave() {
    this.saveAll().catch(e => console.error("Debounced save failed:", e));
  }
"""

if 'public getPersistenceStats()' not in content:
    # Find a good place to add methods, e.g., before handleMessage
    content = content.replace('private async handleMessage(id: string, msg: any) {', methods_to_add + '\n  private async handleMessage(id: string, msg: any) {')

with open('server/src/core/WorldTick.ts', 'w') as f:
    f.write(content)
