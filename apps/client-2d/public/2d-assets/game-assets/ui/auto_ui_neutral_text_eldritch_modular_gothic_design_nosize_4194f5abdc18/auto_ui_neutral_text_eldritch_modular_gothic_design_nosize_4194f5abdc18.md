---
name: Eldritch Modular Gothic
colors:
  surface: '#0f1321'
  surface-dim: '#0f1321'
  surface-bright: '#353849'
  surface-container-lowest: '#0a0d1c'
  surface-container-low: '#171b2a'
  surface-container: '#1b1f2e'
  surface-container-high: '#262939'
  surface-container-highest: '#303444'
  on-surface: '#dfe1f6'
  on-surface-variant: '#c6c5d2'
  inverse-surface: '#dfe1f6'
  inverse-on-surface: '#2c303f'
  outline: '#8f909b'
  outline-variant: '#454650'
  surface-tint: '#b9c3ff'
  primary: '#b9c3ff'
  on-primary: '#1a2a6c'
  primary-container: '#1a2a6c'
  on-primary-container: '#8594dc'
  inverse-primary: '#4b5a9e'
  secondary: '#ffb961'
  on-secondary: '#472a00'
  secondary-container: '#e89300'
  on-secondary-container: '#563400'
  tertiary: '#94d3c1'
  on-tertiary: '#00382e'
  tertiary-container: '#00372d'
  on-tertiary-container: '#65a393'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001356'
  on-primary-fixed-variant: '#334284'
  secondary-fixed: '#ffddb9'
  secondary-fixed-dim: '#ffb961'
  on-secondary-fixed: '#2b1700'
  on-secondary-fixed-variant: '#663e00'
  tertiary-fixed: '#afefdd'
  tertiary-fixed-dim: '#94d3c1'
  on-tertiary-fixed: '#00201a'
  on-tertiary-fixed-variant: '#065043'
  background: '#0f1321'
  on-background: '#dfe1f6'
  surface-variant: '#303444'
  rarity-common: '#9da1aa'
  rarity-magic: '#3498db'
  rarity-rare: '#f1c40f'
  rarity-epic: '#9b59b6'
  rarity-legendary: '#e67e22'
  rarity-mythic: '#ff3355'
  mana-glow: '#48E9FF'
  health-glow: '#ff3355'
  poison-glow: '#70FF9E'
typography:
  display-lg:
    fontFamily: Epilogue
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Epilogue
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Epilogue
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  rarity-tag:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
spacing:
  slot-unit: 64px
  gutter: 16px
  margin-edge: 32px
  panel-padding: 24px
---

## Brand & Style

The design system is a fusion of gritty dark fantasy and high-energy modularity. It targets players seeking a "Dark Fantasy" immersion that remains functional and readable during intense gameplay. The aesthetic combines the visceral, weathered textures of a dark dungeon-crawler with the bold, high-contrast outlines of an illustrative action game.

**Design Style: Brutalist-Gothic**
- **Gritty Textures:** Backgrounds use heavy stone, forged iron, and weathered parchment textures.
- **Vibrant Highlights:** Magical interaction points use high-saturation glows to contrast against the dark base.
- **Modular Framework:** Elements are treated as "slots" or "slabs" with thick, ink-like borders (2px to 4px) to ensure separation even in low-light environments.
- **Physicality:** Every UI panel should feel like an object—a slab of obsidian, a brass-bound tome, or a glowing runic stone.

## Colors

This design system utilizes a deep, atmospheric palette. The primary **Sunset Marine Blue** acts as the core depth color for panels and headers, while **Deep Green** is reserved for subtle secondary backgrounds and "verdant" magic elements. **Sunset Gold** serves as the primary action color for call-to-actions and active states.

The background is a near-black **#050816**, providing a void-like canvas for the vibrant rarity and status colors to pop. Outlines should use a darkened version of the panel color or a solid black to achieve the "Borderlands" illustrative effect.

## Typography

The typography strategy pairs expressive, geometric headlines with high-utility technical fonts. 
- **Headlines:** Uses **Epilogue** for a "gothic-modern" feel—sharp, bold, and authoritative. 
- **Body:** **Inter** ensures that long item descriptions and lore snippets remain perfectly readable regardless of the textured background. 
- **Labels/Data:** **JetBrains Mono** provides a "modular slot" feel, ideal for gear stats, damage numbers, and technical UI elements.

All headers should be rendered with a slight text-shadow to ensure separation from dark, textured backgrounds.

## Layout & Spacing

The layout follows a **Fixed Modular Grid**. Elements are conceived as "Slabs" or "Slots." 
- **The Slot System:** Inventory and skill bars are based on a 64px unit.
- **The Slab System:** HUD elements and menus are fixed-width panels that "anchor" to the corners of the screen.
- **Breakpoints:** On desktop, use a 12-column centered layout for menus. On mobile, transition to a "Full-Screen Slab" where the UI covers the entire viewport with 16px safe-area margins.

Spacing is tight and dense, mimicking a complex RPG interface. Avoid excessive whitespace; instead, use thick borders and tonal shifts to differentiate sections.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** and **Luminous Outlines** rather than traditional shadows.
- **Base Layer:** The "World" or deep background (#050816).
- **Surface Layer:** Weathered Stone texture (#1a2a6c at 20% opacity over dark stone pattern).
- **Interaction Layer:** Elements currently selected or "hovered" emit an internal glow of **Sunset Gold** or their respective **Rarity Color**.
- **Outlines:** Use 2px solid black internal borders with a 1px "highlight" border on the top and left edges to simulate light hitting a carved stone edge.

## Shapes

The shape language is strictly **Sharp (0)**. Everything in this design system is architectural and monolithic. Corners are 90-degree angles to reinforce the stone-slab metaphor. 

The only exception is the use of "Clipped Corners" (45-degree chamfers) on large panel headers to suggest a carved, runic appearance. Small items (icons/slots) must remain perfectly square.

## Components

### Buttons
Primary buttons are "Slabs" of Sunset Gold with a 2px black inner border. Text is JetBrains Mono, uppercase. On hover, the button gains a `0 0 15px` outer glow in the same color.

### Inventory Slots
Square containers (64px or 80px). 
- **Border:** 2px solid black. 
- **Rarity Indicator:** A 4px "Glow Strip" at the bottom of the slot, using the rarity color tokens.
- **Background:** A dark, desaturated version of the primary blue.

### Input Fields
Dark stone textured backgrounds with a 1px Deep Green border. When focused, the border transitions to Sunset Gold with a subtle flicker effect.

### Cards & Modals
Heavy containers with a 4px black outer border. The header of the card should be a distinct block of Sunset Marine Blue, separated from the body by a horizontal stone-carved divider.

### Rarity Tags
Small pill-like (though square-edged) badges using white text on the rarity color background. Use for item names and drop notifications.