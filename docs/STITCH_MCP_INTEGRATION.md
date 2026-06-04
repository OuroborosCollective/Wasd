# Stitch MCP Integration Guide

## Overview

This document describes how we use Google Stitch to design UI for the Arelorian 2D client and how we integrate those designs via MCP (Model Context Protocol).

## Quick Start

### Connecting to Stitch MCP

```python
from openhands.sdk.mcp.utils import create_mcp_tools
from openhands.sdk.mcp.tool import MCPToolAction

STITCH_API_KEY = "your-api-key"
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

### Exporting Screens

We have a script at `/scripts/export-stitch-screens.py` that:
1. Lists all screens from the Stitch project
2. Downloads HTML for each screen
3. Converts HTML to React TSX components
4. Saves to `/apps/client-2d/src/ui/stitch-screens/`

Run with:
```bash
python scripts/export-stitch-screens.py
```

## Stitch Project Structure

### Project ID
```
projects/5320982353793182486
```

### Available Screens (as of 2026-06-04)

| Screen Name | Component | Category |
|-------------|-----------|----------|
| Login Screen - New Logo | LoginScreenNewLogo | auth |
| Character Selection | CharacterSelection | character |
| Ingame HUD | IngameHud | hud |
| Ingame HUD - New Action Triggers | IngameHudNewActionTriggers | hud |
| World & Mini Map | WorldMiniMap | navigation |
| World Loading Screen - 10s Timer | WorldLoadingScreen10sTimer | system |
| Skills Matrix | SkillsMatrix | character |
| Attributes Matrix | AttributesMatrix | character |
| Quest Journal | QuestJournal | quests |
| Quest Reward Popup | QuestRewardPopup | quests |
| Guild Panel | GuildPanel | social |
| Faction Reputation | FactionReputation | social |
| NPC Dialogue - Oracle of Tides | NpcDialogueOracleOfTides | dialogue |
| Settings Menu - Diamond Glass | SettingsMenuDiamondGlass | system |
| Level-Up Celebration | LevelUpCelebration | feedback |
| Gathering Interface - Resource Tracking | GatheringInterfaceResourceTracking | gameplay |
| Crafting Interface - Recipe Management | CraftingInterfaceRecipeManagement | gameplay |
| ARELORIAN Project Brief | ArelorianProjectBrief | docs |

## Component Architecture

```
apps/client-2d/src/
├── ui/
│   ├── stitch-screens/              # Exported Stitch components
│   │   ├── index.ts                 # Registry & exports
│   │   ├── LoginScreenNewLogo.tsx
│   │   ├── CharacterSelection.tsx
│   │   └── ...
│   └── stitch-windows/              # Window management
│       ├── index.ts
│       └── StitchWindowManager.tsx
└── theme/
    └── stitch-theme/
        └── stitchDesignTokens.ts    # Design tokens
```

## Usage in Client

### Basic Window Management

```tsx
import { 
  StitchWindowProvider, 
  StitchWindowLayer,
  useLoginScreen,
  useCharacterSelection,
  useWorldMap 
} from './ui/stitch-windows';

function App() {
  return (
    <StitchWindowProvider defaultScreen="login">
      {/* Your game content */}
      <StitchWindowLayer />
    </StitchWindowProvider>
  );
}

// Open screens from any component
function MenuBar() {
  const login = useLoginScreen();
  const map = useWorldMap();
  
  return (
    <>
      <button onClick={login.open}>Login</button>
      <button onClick={map.toggle}>Toggle Map</button>
    </>
  );
}
```

### Available Hooks

| Hook | Purpose |
|------|---------|
| `useLoginScreen()` | Login window |
| `useCharacterSelection()` | Character selection |
| `useWorldMap()` | World/minimap |
| `useSettings()` | Settings menu |
| `useGuild()` | Guild panel |
| `useQuests()` | Quest journal |
| `useSkills()` | Skills matrix |
| `useLevelUp()` | Level-up celebration |
| `useStitchScreen(screenId)` | Generic hook for any screen |

## Design Tokens

### Colors

The Stitch design uses a dark "deep-marine" theme with neon accents:

```typescript
import { stitchColors } from './theme/stitch-theme/stitchDesignTokens';

// Primary colors
stitchColors.primary       // '#afc8f0' - Blurple/winter blue
stitchColors.secondary     // '#ffb77d' - Energy amber  
stitchColors.tertiary      // '#2ae500' - Malachite green
stitchColors['mana-cyan']  // '#00E5FF' - Mana cyan
stitchColors['energy-amber'] // '#FF7A00' - Energy amber

// Backgrounds
stitchColors['deep-marine'] // '#101419' - Primary background
stitchColors['void-black']  // '#070711' - Deepest black
```

### Typography

Uses `Epilogue` for display, `Inter` for body, and `JetBrains Mono` for labels:

```typescript
import { stitchTypography } from './theme/stitch-theme/stitchDesignTokens';
```

### Glassmorphism

```css
.glass-panel {
  background-color: rgba(16, 20, 25, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

## Best Practices

### 1. Screen Export Workflow

1. Design screen in Stitch
2. Run export script: `python scripts/export-stitch-screens.py`
3. Review generated TSX files
4. Add to component registry in `index.ts`
5. Create window hook if needed

### 2. Customizing Exported Components

The exported components use `dangerouslySetInnerHTML`. To convert to proper React:

1. Copy HTML structure to JSX manually
2. Replace `class` with `className`
3. Convert inline styles to style objects
4. Add TypeScript interfaces for props
5. Extract repeated patterns into sub-components

### 3. Adding New Screens

1. Create in Stitch with descriptive title
2. Export with script
3. Register in `stitch-screens/index.ts`
4. Add to `STITCH_SCREENS` in `StitchWindowManager.tsx`
5. Create convenience hook if needed

### 4. Maintaining Consistency

- Use `stitchColors` for all colors
- Use `stitchTypography` for text styles
- Use glassmorphism utility class for panels
- Keep hex button shape via `clip-path`

## Troubleshooting

### MCP Connection Issues

If connection fails, check:
- API key is valid and not expired
- Project ID is correct
- Network can reach `stitch.googleapis.com`

### Export Script Errors

The script expects:
- `requests` library installed
- Valid Stitch API key
- Internet connection to download HTML

### Component Rendering Issues

If screens don't render:
- Check Tailwind classes are valid
- Verify Google Fonts are loaded
- Check for syntax errors in HTML conversion

## Future Enhancements

- [ ] Automated Tailwind class validation
- [ ] Better HTML-to-JSX converter
- [ ] Component testing framework
- [ ] Design token sync from Stitch

---

Last updated: 2026-06-04