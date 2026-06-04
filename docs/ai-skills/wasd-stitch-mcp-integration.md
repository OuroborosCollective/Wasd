# Stitch MCP Integration Skill

## Overview

This skill enables agents to connect to Google Stitch via MCP (Model Context Protocol) to design UI for the Arelorian 2D client. Stitch provides a visual design tool where the user creates UI screens that are then exported and integrated into `apps/client-2d/`.

## Quick Reference

### API Key
**Note: API key should be obtained from the user directly. Do not store real API keys in documentation.**

- User provided key format: `AQ.Ab8...` (Google API Key for Stitch)
- Project ID: `5320982353793182486`
- URL: https://stitch.withgoogle.com/projects/5320982353793182486

### Key Paths
| Purpose | Path |
|---------|------|
| Stitch screens (TSX) | `apps/client-2d/src/ui/stitch-screens/` |
| Window manager | `apps/client-2d/src/ui/stitch-windows/StitchWindowManager.tsx` |
| Design tokens | `apps/client-2d/src/theme/stitch-theme/stitchDesignTokens.ts` |
| Docs | `docs/STITCH_MCP_INTEGRATION.md` |
| 2D Design System | `docs/2D_CLIENT_DESIGN_SYSTEM.md` |

## Connecting to Stitch MCP

### OpenHands Configuration

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "stitch": {
      "type": "remote",
      "url": "https://stitch.googleapis.com/mcp",
      "enabled": true,
      "headers": {
        "X-Goog-Api-Key": "USER_PROVIDED_API_KEY"
      }
    }
  }
}
```

### Python MCP Connection

```python
from openhands.sdk.mcp.utils import create_mcp_tools
from openhands.sdk.mcp.tool import MCPToolAction

STITCH_API_KEY = "USER_PROVIDED_API_KEY"  # Get from user
PROJECT_ID = "5320982353793182486"

mcp_config = {
    "mcpServers": {
        "stitch": {
            "url": "https://stitch.googleapis.com/mcp",
            "transport": "streamable-http",
            "headers": {"X-Goog-Api-Key": STITCH_API_KEY},
            "timeout": 120
        }
    }
}

with create_mcp_tools(mcp_config) as client:
    list_screens_tool = next(t for t in client.tools if t.name == "list_screens")
    action = MCPToolAction(data={"projectId": PROJECT_ID})
    result = list_screens_tool(action)
```

## Available Stitch MCP Tools

| Tool | Purpose |
|------|---------|
| `list_screens` | List all screens in the project |
| `get_screen` | Get a specific screen by name/ID |
| `export_screen_html` | Export screen as HTML |
| `get_project` | Get project metadata |

## Stitch Screen Components

The following screens are currently integrated (54 total):

### Authentication & Character
| Screen | Component | Category |
|--------|-----------|----------|
| Login Screen - New Logo | `LoginScreenNewLogo` | auth |
| Character Selection | `CharacterSelection` | character |
| Attributes Matrix | `AttributesMatrix` | character |
| Skills Matrix | `SkillsMatrix` | character |

### HUD & Navigation
| Screen | Component | Category |
|--------|-----------|----------|
| Ingame HUD | `IngameHud` | hud |
| Ingame HUD - New Action Triggers | `IngameHudNewActionTriggers` | hud |
| World & Mini Map | `WorldMiniMap` | navigation |
| Gameplay HUD - Quest Tracker | `GameplayHUDQuestTracker` | hud |
| Gameplay HUD - Collapsible Panels | `GameplayHUDCollapsiblePanels` | hud |

### Quests & Dialogue
| Screen | Component | Category |
|--------|-----------|----------|
| Quest Journal | `QuestJournal` | quests |
| Quest Reward Popup | `QuestRewardPopup` | quests |
| NPC Dialogue - Oracle of Tides | `NpcDialogueOracleOfTides` | dialogue |

### Social & Guild
| Screen | Component | Category |
|--------|-----------|----------|
| Guild Panel | `GuildPanel` | social |
| Faction Reputation | `FactionReputation` | social |
| Mail Interface - Communications | `MailInterfaceCommunications` | social |
| Trade Window - Player Exchange | `TradeWindowPlayerExchange` | social |
| Party & Raid Interface - Group Finder | `PartyRaidInterface` | social |
| Social Hub - Friends & Party | `SocialHubFriends` | social |

### Inventory & Items
| Screen | Component | Category |
|--------|-----------|----------|
| Inventory Matrix - Animated | `InventoryMatrixAnimated` | inventory |
| Inventory Matrix - 30-Slot Grid | `InventoryMatrix30Slot` | inventory |
| Pet & Mount Interface | `PetMountInterface` | inventory |
| Modular Item Detail - 3-Part Structure | `ModularItemDetail3Part` | item-detail |
| Modular Item Detail View | `ModularItemDetailView` | item-detail |
| Modular Dagger Detail - Silent Sting | `ModularDaggerDetail` | item-detail |
| Modular Spear Detail - Guardian Pike | `ModularSpearDetail` | item-detail |
| Modular Axe Detail - 2H Heavy Cleaver | `ModularAxeDetail` | item-detail |
| Modular Staff Detail - Crystalline Focus | `ModularStaffDetail` | item-detail |
| Modular Weapon Detail - 3-Part Logic | `ModularWeaponDetail3Part` | item-detail |

### Crafting & Upgrade
| Screen | Component | Category |
|--------|-----------|----------|
| Gathering Interface | `GatheringInterfaceResourceTracking` | gameplay |
| Crafting Interface | `CraftingInterfaceRecipeManagement` | gameplay |
| Upgrade & Refinement - Crystalline Forge | `UpgradeCrystallineForge` | upgrade |
| Upgrade & Refinement - Dark Cyber-Zen | `UpgradeDarkCyberZen` | upgrade |
| Refinement Success - Celebration | `RefinementSuccess` | upgrade |
| Refinement Failed - Critical Error | `RefinementFailed` | upgrade |

### World & Atlas
| Screen | Component | Category |
|--------|-----------|----------|
| World Loading Screen - 10s Timer | `WorldLoadingScreen10sTimer` | system |
| World Atlas - Pathfinding & Icon Glossary | `WorldAtlasPathfinding` | navigation |
| World Atlas - Town Zoom & Group Finder | `WorldAtlasTownZoom` | navigation |
| Interactive World Atlas | `InteractiveWorldAtlas` | navigation |
| Interactive World Map | `InteractiveWorldMap` | navigation |

### Dungeons & Raids
| Screen | Component | Category |
|--------|-----------|----------|
| Dungeon & Raid Browser | `DungeonRaidBrowser` | gameplay |
| Warfront Victory - Sector Secured | `WarfrontVictory` | warfront |
| Warfront Defeat - Tactical Retreat | `WarfrontDefeat` | warfront |
| Warfront Leaderboard & Rewards | `WarfrontLeaderboard` | warfront |
| Warfront Rewards - Animated Claim | `WarfrontRewards` | warfront |
| Warfront - Strategic Map & Combat Log | `WarfrontStrategicMap` | warfront |

### Weather Effects
| Screen | Component | Category |
|--------|-----------|----------|
| Weather Overlay - Rain (Cyan Surge) | `WeatherOverlayRain` | effects |
| Weather Overlay - Sandstorm (Solar Haze) | `WeatherOverlaySandstorm` | effects |
| Weather Overlay - Electron Storm (Neon Surge) | `WeatherOverlayElectronStorm` | effects |

### System & Support
| Screen | Component | Category |
|--------|-----------|----------|
| Settings Menu - Diamond Glass | `SettingsMenuDiamondGlass` | system |
| Level-Up Celebration | `LevelUpCelebration` | feedback |
| Support, Tutorials & Achievements | `SupportTutorialsAchievements` | system |
| Teleport & Travel Menu - Boss Timers | `TeleportTravelMenu` | navigation |
| Auction & Market Window | `AuctionMarketWindow` | economy |

## Design Token Reference

### Colors

```typescript
// Primary (blurple/winter blue)
'#afc8f0'  // primary
'#d4e3ff'  // primary-fixed
'#001f3f'  // primary-container

// Secondary (energy amber)
'#ffb77d'  // secondary
'#ffdcc3'  // secondary-fixed
'#fd8b00'  // secondary-container

// Tertiary (malachite green)
'#2ae500'  // tertiary
'#79ff5b'  // tertiary-fixed

// Mana & Energy
'#00E5FF'  // mana-cyan
'#FF7A00'  // energy-amber

// Backgrounds
'#101419'  // deep-marine (primary background)
'#070711'  // void-black (deepest)
```

### Typography

| Style | Font | Size |
|-------|------|------|
| Display | Epilogue | 48px |
| Headline | Epilogue | 24px |
| Body | Inter | 16-18px |
| Labels | JetBrains Mono | 10-12px |

## Workflow: Adding a New Screen

1. **User creates screen in Stitch** at https://stitch.withgoogle.com

2. **Agent lists available screens** via MCP:
   ```
   list_screens tool with projectId: "5320982353793182486"
   ```

3. **Agent exports screen** via MCP:
   ```
   export_screen_html tool with projectId and screenName
   ```

4. **Agent creates component** in `apps/client-2d/src/ui/stitch-screens/`

5. **Agent registers in index.ts**:
   ```typescript
   export { NewScreen } from './NewScreen';
   ```

6. **Agent adds to StitchWindowManager**:
   ```typescript
   // Add to STITCH_COMPONENT_MAP
   // Add to STITCH_SCREENS type and registry
   // Create convenience hook if needed
   ```

7. **Agent creates PR** with descriptive branch name like `feature/stitch-new-screen-name`

## Window Management Usage

```tsx
import { 
  StitchWindowProvider, 
  StitchWindowLayer,
  useLoginScreen,
  useQuests 
} from './ui/stitch-windows';

function App() {
  return (
    <StitchWindowProvider>
      <YourGameContent />
      <StitchWindowLayer />
    </StitchWindowProvider>
  );
}

function MenuButton() {
  const { open: openQuests } = useQuests();
  
  return <button onClick={openQuests}>Quests</button>;
}
```

## Planned Screens

The user has indicated interest in creating:
- [ ] Trade Window
- [ ] Mail/Message System
- [ ] Achievement Panel
- [ ] Market/Auction House
- [ ] Mount/Pet Interface
- [ ] Social Friends List

## Additional Screens in Stitch (Not Yet Integrated)

These screens exist in Stitch but are not yet in the codebase:
- Trade Window - Player Exchange
- Gameplay HUD - AI Lore Helper & Timeline
- Gameplay HUD - Quest Tracker Overlay
- Gameplay HUD - Collapsible Buff Bar
- Gameplay HUD - Buff Bar & Feedback
- Gameplay HUD - Collapsible Panels & Mini Icons
- Weather Overlay - Rain (Cyan Surge)
- World Atlas - Town Zoom & Group Finder
- Refinement Success - Celebration Overlay
- Refinement Failed - Critical Error Overlay
- Upgrade & Refinement - Dark Cyber-Zen Edition
- Upgrade & Refinement - Crystalline Forge
- Modular Item Detail - 3-Part Structure
- Modular Dagger Detail - Silent Sting
- Modular Spear Detail - Guardian Pike

## Troubleshooting

### MCP Connection Issues
- Verify API key is valid and not expired
- Check project ID is correct: `5320982353793182486`
- Ensure network can reach `stitch.googleapis.com`

### Component Rendering Issues
- Check Tailwind classes are valid (2D client uses native CSS, not Tailwind by default)
- Verify Google Fonts are loaded
- Check for syntax errors in HTML conversion

## Notes

- The 2D client uses **native CSS** (not Tailwind) for styling - see AGENTS.md
- Stitch components initially use `dangerouslySetInnerHTML` and should be refined over time
- Design uses glassmorphism with dark "deep-marine" backgrounds
- Hexagonal button shapes via `clip-path` are part of the design language