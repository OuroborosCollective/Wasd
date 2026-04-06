# WASD Architecture Overview

## System-Komponenten-Diagramm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                      │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Browser (Vite + TypeScript + Babylon.js)                            │   │
│  │  - 3D-Rendering                                                     │   │
│  │  - Input Handling (WASD, Mouse, Touch)                             │   │
│  │  - UI Components (Inventory, Chat, Minimap)                        │   │
│  │  - WebSocket Connection Management                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ WebSocket
                                 │ (Real-time Communication)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NETWORKING LAYER                                    │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  WebSocketServer (server/src/networking/WebSocketServer.ts)        │   │
│  │  - Client Connection Management                                     │   │
│  │  - Event Routing (input, interact, attack)                         │   │
│  │  - Broadcast Payload Distribution                                  │   │
│  │  - Session Heartbeat                                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PacketRouter (server/src/networking/PacketRouter.ts)              │   │
│  │  - Route incoming packets to handlers                              │   │
│  │  - Validate packet integrity                                       │   │
│  │  - Rate limiting                                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  PlayerSession (server/src/networking/PlayerSession.ts)            │   │
│  │  - Session state management                                        │   │
│  │  - Player data synchronization                                     │   │
│  │  - Logout handling                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CORE GAME LOOP                                      │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  WorldTick (server/src/core/WorldTick.ts) - Every 100ms             │   │
│  │                                                                       │   │
│  │  1. Process Player Input                                            │   │
│  │     - WASD Movement                                                 │   │
│  │     - Attack/Interact Commands                                      │   │
│  │     - Position Updates                                              │   │
│  │                                                                       │   │
│  │  2. Update NPC Systems                                              │   │
│  │     - npcSystem.tick(players, worldTime)                            │   │
│  │     - NPCMemoryBridge LLM decisions                                 │   │
│  │     - Relationship updates                                          │   │
│  │                                                                       │   │
│  │  3. Update World Systems                                            │   │
│  │     - worldSystem.tick()                                            │   │
│  │     - Weather updates                                               │   │
│  │     - Resource respawns                                             │   │
│  │                                                                       │   │
│  │  4. Process Combat                                                  │   │
│  │     - combatSystem.tick()                                           │   │
│  │     - Damage calculations                                           │   │
│  │     - Loot generation                                               │   │
│  │                                                                       │   │
│  │  5. Update Economy                                                  │   │
│  │     - Price balancing                                               │   │
│  │     - Market updates                                                │   │
│  │                                                                       │   │
│  │  6. Persist Data                                                    │   │
│  │     - persistenceSystem.save()                                      │   │
│  │                                                                       │   │
│  │  7. Broadcast Entity Sync                                           │   │
│  │     - Send player/NPC/loot positions                                │   │
│  │     - Send state changes                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
         ┌────────────┐  ┌──────────────┐  ┌────────────┐
         │   NPC      │  │    World     │  │   Combat   │
         │  Systems   │  │   Systems    │  │  Systems   │
         └────────────┘  └──────────────┘  └────────────┘
                │                │                │
                └────────────────┼────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULE LAYER (70+ Modules)                            │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NPC & AI Systems                                                   │   │
│  │  - NPCSystem                 - NPCMemoryBridge                      │   │
│  │  - NPCPersonalityEngine      - NPCThinkingLogService               │   │
│  │  - NPCRelationshipSystem     - NPCScheduleRegistry                 │   │
│  │  - NPCGenealogyEngine        - BehaviorTree                        │   │
│  │  - LLMConnector              - NPCBrain                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  World Systems                                                      │   │
│  │  - WorldSystem               - ChunkSystem                          │   │
│  │  - TerrainGenerator          - WeatherSystem                        │   │
│  │  - ResourceSystem            - ResourceScatter                      │   │
│  │  - ObserverEngine            - NavMeshNodes                         │   │
│  │  - Pathfinding               - WorldObjectSystem                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Combat & Gameplay                                                  │   │
│  │  - CombatSystem              - LootSystem                           │   │
│  │  - ItemGenerator             - AffixSystem                          │   │
│  │  - EquipmentSystem           - SkillSystem                          │   │
│  │  - MonsterSpawner            - DungeonSystem                        │   │
│  │  - SiegeEngine               - ConstructionSystem                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Economy & Trade                                                    │   │
│  │  - EconomySystem             - MarketSystem                         │   │
│  │  - AuctionSystem             - PriceBalancer                        │   │
│  │  - NPCTradeAI                - PaymentSystem                        │   │
│  │  - FarmingSystem             - CraftingSystem                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Social Systems                                                     │   │
│  │  - GuildSystem               - FactionSystem                        │   │
│  │  - ReputationSystem          - SocialSystem                         │   │
│  │  - ChatSystem                - MailService                          │   │
│  │  - RelationshipSystem        - DiplomacySystem                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Player & Character                                                 │   │
│  │  - CharacterSystem           - InventorySystem                      │   │
│  │  - PlayerSession             - AchievementSystem                    │   │
│  │  - QuestSystem               - HousingSystem                        │   │
│  │  - MountSystem               - GrowthSystem                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Infrastructure                                                     │   │
│  │  - PersistenceSystem         - AuthSystem                           │   │
│  │  - TelemetryCollector        - PerformanceBudget                    │   │
│  │  - AdminAuditLog             - SecuritySystem                       │   │
│  │  - HeuristicWorldBrain       - MigrationEngine                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                ▼                ▼                ▼
         ┌────────────┐  ┌──────────────┐  ┌────────────┐
         │ Firestore  │  │    Redis     │  │  External  │
         │ (Persist)  │  │   (Cache)    │  │   APIs     │
         └────────────┘  └──────────────┘  └────────────┘
```

---

## NPC Decision Pipeline (Detailliert)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NPC Tick (100ms)                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                ▼                     ▼
        ┌────────────────┐  ┌──────────────────┐
        │ Initialize     │  │ Load Schedule    │
        │ Needs Decay    │  │ (NPCSchedule)    │
        └────────┬───────┘  └────────┬─────────┘
                 │                   │
                 └───────────┬───────┘
                             │
                             ▼
        ┌──────────────────────────────────┐
        │ Dynamic Drive-Decay              │
        │ (Activity-Based)                 │
        │                                  │
        │ if state == "combat":            │
        │   decay *= 3.0                   │
        │ else if state == "idle":         │
        │   decay *= 0.5                   │
        │ else:                            │
        │   decay *= 1.5                   │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Check Player Proximity           │
        │ (< 15 units = Interaction)       │
        └──────────────┬───────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
        [YES]                   [NO]
        │                       │
        ▼                       ▼
   ┌─────────┐          ┌──────────────┐
   │ Set     │          │ State        │
   │ State   │          │ Machine      │
   │ to      │          │ (idle/       │
   │ Inter   │          │ wander)      │
   │ acting  │          └──────┬───────┘
   └────┬────┘                 │
        │                      ▼
        │          ┌──────────────────────┐
        │          │ Movement Logic       │
        │          │ - Target Position    │
        │          │ - Pathfinding        │
        │          │ - Collision Avoid    │
        │          └──────────┬───────────┘
        │                     │
        └─────────────┬───────┘
                      │
                      ▼
        ┌──────────────────────────────────┐
        │ Relationship Updates             │
        │ (NPCRelationshipSystem)          │
        │                                  │
        │ - Decay affinity                 │
        │ - Check knowledge-sharing        │
        │ - Update social state            │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ LLM Decision (Optional)          │
        │ (NPCMemoryBridge)                │
        │                                  │
        │ 1. Load Thinkinglogs (Redis)     │
        │ 2. Generate Summary (LLM)        │
        │ 3. Build Memory Context          │
        │ 4. Generate System Prompt        │
        │ 5. Query LLM for action          │
        │ 6. Parse JSON response           │
        └──────────────┬───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Broadcast NPC State              │
        │ - Position                       │
        │ - Animation                      │
        │ - Dialogue (if interacting)      │
        └──────────────────────────────────┘
```

---

## Data Flow: Player Movement (WASD)

```
Client: Key Press (W, A, S, D)
        │
        ▼
JavaScript Event Handler
        │
        ▼
WebSocket Emit: "input"
{ playerId, direction: "forward", boost: false }
        │
        ▼
Server: WebSocketServer.on("input")
        │
        ▼
PlayerSession.updateMovement()
        │
        ├─ Calculate velocity from direction
        ├─ Apply boost multiplier if active
        └─ Store in player.velocity
        │
        ▼
WorldTick: processPlayerInput()
        │
        ├─ For each player:
        │  ├─ Get velocity
        │  ├─ Calculate new position
        │  ├─ Check collision
        │  └─ Update player.position
        │
        ▼
ObserverEngine.updateVisibility()
        │
        ├─ Find nearby chunks
        ├─ Find nearby entities
        └─ Update player.visibleEntities
        │
        ▼
WorldTick: broadcastEntitySync()
        │
        ├─ For each player:
        │  ├─ Collect visible entities
        │  ├─ Create sync payload
        │  └─ Send via WebSocket
        │
        ▼
Client: Receive "entitySync"
        │
        ▼
Update Babylon.js scene (via engine bridge)
        │
        ├─ Update player position
        ├─ Update NPC positions
        ├─ Update loot positions
        └─ Render frame
```

---

## Database Schema (Firestore)

```
firestore/
├── players/
│   └── {playerId}
│       ├── username: string
│       ├── position: { x, y, z }
│       ├── health: number
│       ├── inventory: Item[]
│       ├── quests: Quest[]
│       ├── reputation: { factionId: number }
│       └── flags: { flagName: boolean }
│
├── npcs/
│   └── {npcId}
│       ├── name: string
│       ├── role: string
│       ├── position: { x, y, z }
│       ├── health: number
│       ├── personality: { courage, curiosity, ... }
│       ├── memory: MemoryEntry[]
│       ├── needs: { hunger, energy }
│       ├── affinity: { npcId: number }
│       └── state: string
│
├── items/
│   └── {itemId}
│       ├── name: string
│       ├── type: string
│       ├── rarity: string
│       ├── stats: { damage, armor, ... }
│       └── affixes: Affix[]
│
├── guilds/
│   └── {guildId}
│       ├── name: string
│       ├── founderId: string
│       ├── members: GuildMember[]
│       ├── ranks: GuildRank[]
│       └── treasury: number
│
├── quests/
│   └── {questId}
│       ├── name: string
│       ├── description: string
│       ├── objectives: Objective[]
│       ├── rewards: Reward[]
│       └── prerequisiteQuestIds: string[]
│
├── factions/
│   └── {factionId}
│       ├── name: string
│       ├── description: string
│       └── memberIds: string[]
│
├── market/
│   └── {listingId}
│       ├── sellerId: string
│       ├── itemId: string
│       ├── price: number
│       ├── quantity: number
│       └── createdAt: timestamp
│
└── auctions/
    └── {auctionId}
        ├── itemId: string
        ├── sellerId: string
        ├── startPrice: number
        ├── currentBid: number
        ├── highestBidderId: string
        ├── endTime: timestamp
        └── bids: Bid[]
```

---

## Redis Cache Schema

```
redis/
├── player:{playerId}:session
│   └── { playerId, username, position, health, ... }
│
├── npc:{npcId}:thinkinglogs
│   └── List of ThinkingLogEntry
│       { timestamp, action, thought }
│
├── npc:{npcId}:currentthought
│   └── { action, thought, dialogText }
│   └── TTL: 30 seconds
│
├── summarization:{npcId}
│   └── { summary, timestamp }
│   └── TTL: 60 seconds
│
├── chunk:{chunkX}:{chunkY}
│   └── { entityIds: string[] }
│
└── market:prices
    └── { itemId: price }
```

---

## Module Dependencies

```
Core Dependencies:
  WorldTick
    ├─ NPCSystem
    │   ├─ NPCPersonalityEngine
    │   ├─ NPCMemoryEngine
    │   ├─ NPCMemoryBridge
    │   │   ├─ NPCThinkingLogService
    │   │   └─ LLMConnector
    │   ├─ NPCRelationshipSystem
    │   ├─ NPCScheduleRegistry
    │   └─ NPCGenealogyEngine
    │
    ├─ WorldSystem
    │   ├─ ChunkSystem
    │   ├─ TerrainGenerator
    │   ├─ WeatherSystem
    │   ├─ ResourceSystem
    │   ├─ ObserverEngine
    │   └─ Pathfinding
    │
    ├─ CombatSystem
    │   ├─ LootSystem
    │   ├─ ItemGenerator
    │   ├─ AffixSystem
    │   └─ SkillSystem
    │
    ├─ EconomySystem
    │   ├─ MarketSystem
    │   ├─ AuctionSystem
    │   ├─ PriceBalancer
    │   └─ NPCTradeAI
    │
    ├─ GuildSystem
    ├─ FactionSystem
    ├─ QuestSystem
    ├─ ChatSystem
    └─ PersistenceSystem
```

---

## Performance Characteristics

| System | Complexity | Tick Time | Notes |
| :--- | :--- | :--- | :--- |
| **WorldTick** | O(n) | ~100ms | n = number of active systems |
| **NPCSystem** | O(m) | ~50ms | m = number of NPCs |
| **ChunkSystem** | O(1) | <1ms | Spatial partitioning |
| **ObserverEngine** | O(k) | ~10ms | k = visible entities |
| **CombatSystem** | O(p) | ~20ms | p = active combats |
| **EconomySystem** | O(1) | ~5ms | Cached price updates |
| **LLMConnector** | O(1) | ~500ms | Async, non-blocking |

---

**Dokumentation Version:** 1.0  
**Letzte Aktualisierung:** 2026-03-31
