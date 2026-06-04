# Arelorian 2D Client Design System

## Overview

The Arelorian 2D client uses an isometric pixel-art rendering engine (PixiJS v7) with a React-based UI overlay. This document describes the design system, component architecture, and best practices.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Arelorian 2D Client                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React UI Layer (Overlay)                │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │   │
│  │  │ HUD     │  │ Windows │  │ Stitch Screens     │  │   │
│  │  │         │  │ Manager │  │ (exported designs) │  │   │
│  │  └────┬────┘  └────┬────┘  └─────────┬─────────┘  │   │
│  └───────┼─────────────┼─────────────────┼────────────┘   │
│          │             │                 │                │
│  ┌───────┴─────────────┴─────────────────┴────────────┐   │
│  │                    UIManager                         │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────┴─────────────────────────────┐   │
│  │              PixiJS Renderer (Canvas)               │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────┐    │   │
│  │  │ World   │  │ Entities│  │ Effects/FX      │    │   │
│  │  │ Chunks  │  │ Sprites │  │                  │    │   │
│  │  └─────────┘  └─────────┘  └─────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## UI Layer Structure

### Component Hierarchy

```
App.tsx
├── DeterministicWorldIsoApp
│   ├── PixiCanvas (PixiJS renderer)
│   │   ├── ChunkManager
│   │   ├── EntityLayer
│   │   └── EffectsLayer
│   │
│   ├── UIManager (React overlay)
│   │   ├── ArelorianHud
│   │   ├── StitchWindowLayer
│   │   │   ├── LoginScreenNewLogo
│   │   │   ├── CharacterSelection
│   │   │   ├── WorldMiniMap
│   │   │   └── ... (other Stitch screens)
│   │   │
│   │   ├── BaseWindows/
│   │   │   ├── InventoryPanel
│   │   │   ├── QuestJournal
│   │   │   ├── SkillWindow
│   │   │   └── ...
│   │   │
│   │   └── Overlays/
│   │       ├── InteractionPrompt
│   │       ├── ChatMiniPanel
│   │       └── ToastStack
│   │
│   └── NetworkClient (WebSocket)
```

## Design System

### Color Palette

The design uses a "Cyber-Zen" aesthetic - dark mystical backgrounds with neon accents:

#### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#afc8f0` | Main interactive elements, buttons |
| Primary Fixed | `#d4e3ff` | Highlighted states |
| Primary Container | `#001f3f` | Backgrounds for primary content |

#### Accent Colors
| Name | Hex | Usage |
|------|-----|-------|
| Mana Cyan | `#00E5FF` | Magic, mana, water, tech elements |
| Energy Amber | `#FF7A00` | Energy, fire, warnings |
| Tertiary (Malachite) | `#2ae500` | Health, success, nature |

#### Backgrounds
| Name | Hex | Usage |
|------|-----|-------|
| Deep Marine | `#101419` | Main background |
| Void Black | `#070711` | Deepest shadows |
| Surface | `#101419` | Panel backgrounds |

#### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Error | `#ffb4ab` | Errors, damage |
| Secondary | `#ffb77d` | Secondary actions, highlights |

### Typography

#### Font Families
- **Display**: `Epilogue` - Headlines, titles, branding
- **Body**: `Inter` - Regular text, UI elements
- **Labels**: `JetBrains Mono` - Stats, codes, technical info

#### Type Scale
```css
/* Display */
text-display-lg: 48px / 56px / -0.02em / 700

/* Headlines */
text-headline-md: 24px / 32px / 0.05em / 600

/* Body */
text-body-lg: 18px / 28px
text-body-md: 16px / 24px

/* Labels */
text-label-caps: 12px / 16px / 0.15em / 500 (monospace)
text-label-sm: 10px / 14px (monospace)
```

### Spacing System

Based on 8px grid:
```css
--spacing-unit: 8px;
--spacing-gutter: 16px;
--spacing-margin-mobile: 20px;
--spacing-margin-tablet: 40px;
--spacing-touch-min: 44px;  /* Mobile touch targets */
```

### Visual Effects

#### Glassmorphism
```css
.glass-panel {
  background-color: rgba(16, 20, 25, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: inset 0 0 20px rgba(175, 200, 240, 0.05);
}
```

#### Hexagonal Buttons
```css
.hex-button {
  clip-path: polygon(10% 0, 90% 0, 100% 50%, 90% 100%, 10% 100%, 0 50%);
}
```

#### Glowing Effects
```css
/* Mana glow */
text-mana-cyan { 
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.6);
}

/* Energy glow */
text-energy-amber {
  text-shadow: 0 0 10px rgba(255, 122, 0, 0.6);
}
```

## UI Components

### Base Components

#### Window Base
- Draggable container
- Close/minimize buttons
- Title bar with icon
- Glass panel background
- Rounded corners (0.75rem)

#### Button Variants
1. **Primary** - Filled with secondary color
2. **Secondary** - Ghost/outline style
3. **Icon** - Square with centered icon
4. **Hex** - Hexagonal shape for skills

#### Input Fields
- Bottom border only (minimal)
- Focus glow animation
- Material icons prefix

### HUD Components

#### Action Bar
- Bottom-center positioned
- Circular buttons
- Hotkey indicators
- Cooldown overlays

#### Mini Map
- Circular or square
- Radar sweep animation
- Player position marker
- Zoom controls

#### Stats Display
- HP/MP progress bars
- Gradient fills with glow
- Numeric values

### Stitch Screen Components

#### Login Screen
- Centered glass panel
- Logo display
- Display name input
- Resume/Guest buttons
- World status footer

#### Character Selection
- Character portraits
- Class/level info
- Selection highlight
- Enter World button

#### Quest Journal
- Tabbed interface (Active/Completed)
- Quest list with icons
- Progress indicators
- Reward preview

## Integration Guide

### Adding New Stitch Screens

1. **Design in Stitch**
   - Use consistent naming convention
   - Follow color palette
   - Export with HTML code

2. **Export to Component**
   ```bash
   python scripts/export-stitch-screens.py
   ```

3. **Register Component**
   ```typescript
   // apps/client-2d/src/ui/stitch-screens/index.ts
   export { LoginScreenNewLogo } from './LoginScreenNewLogo';
   ```

4. **Add to Window Manager**
   ```typescript
   // apps/client-2d/src/ui/stitch-windows/StitchWindowManager.tsx
   export const STITCH_SCREENS = {
     login: { component: 'LoginScreenNewLogo', title: 'Login', modal: true },
     // ...
   };
   ```

5. **Create Hook**
   ```typescript
   // apps/client-2d/src/ui/stitch-windows/StitchWindowManager.tsx
   export function useLoginScreen() {
     return useStitchScreen('login');
   }
   ```

### Connecting to Game Events

```tsx
function QuestTracker() {
  const { open: openQuest } = useQuests();
  
  // Open quest journal when quest is received
  useEffect(() => {
    if (newQuest) {
      openQuest();
    }
  }, [newQuest]);
}
```

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile Adaptations
- Larger touch targets (44px minimum)
- Simplified HUD
- Gesture controls
- Virtual joystick for movement

### Desktop Features
- Full action bar
- Detailed minimap
- Keyboard shortcuts
- Hover states

## Performance Considerations

### Rendering
- Use sprite batching for entities
- Limit glass-panel effects on mobile
- Lazy load Stitch screens

### Animation
- Use CSS animations over JS where possible
- Limit particle effects
- Throttle UI updates

## Best Practices

1. **Component Isolation**
   - Stitch screens should be self-contained
   - Minimize coupling with game state
   - Use callbacks for interactions

2. **Accessibility**
   - Keyboard navigation support
   - ARIA labels on interactive elements
   - Focus management

3. **Theming**
   - Use design tokens, not hardcoded values
   - Maintain consistency across components
   - Document customizations

4. **Testing**
   - Test on actual mobile devices
   - Verify touch targets are large enough
   - Check dark/light mode compatibility

## Future Enhancements

### Planned Screens
- [ ] Trade Window
- [ ] Mail/Message System
- [ ] Achievement Panel
- [ ] Market/Auction House
- [ ] Mount/Pet Interface
- [ ] Social Friends List
- [ ] Tutorial Overlay
- [ ] Help/Guide System

### Design Improvements
- [ ] Component library documentation
- [ ] Storybook integration
- [ ] Design token synchronization
- [ ] Automated screenshot testing

---

Last updated: 2026-06-04