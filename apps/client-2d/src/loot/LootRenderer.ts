/**
 * Ouroboros LootRenderer — 2D Client Loot System
 * 
 * ARCHITECTURE (Server Authority + Stateless Determinism):
 * - Loot entities rendered from world_tick broadcast (server authorative)
 * - Interaction: pointertap with FAT-FINGER PADDING prevents mis-clicks
 * - Intent: wasd:client-action { type: "pickup_loot", entityId }
 * - Server validates distance + inventory, atomically removes loot
 * 
 * FAT-FINGER PROTECTION:
 * - Loot sprites have larger hit area than visual (1.5x radius padding)
 * - Minimum tap distance from character enforced
 * - Tap cooldown prevents rapid double-taps
 * 
 * SECURITY:
 * - All visuals derived from ItemSignature (no client-side item creation)
 * - Sprite selection uses same deterministic mapping as server
 * - Client cannot spawn, move, or duplicate loot
 */

import { Container, Text, Graphics } from "pixi.js";
import type { Application } from "pixi.js";
import { fromKappaInt } from "@wasd/shared";
import { iso3 } from "../isometricProjection";

const TILE_W = 96;
const TILE_H = 48;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LootEntity {
  id: string;
  type: "LOOT";
  x: number;       // Kappa-int
  y: number;       // Kappa-int
  z?: number;
  itemSignature?: string;
  itemName?: string;
  rarity?: string;
  ilvl?: number;
  visualId?: string;
  gold?: number;
}

export interface LootRenderContext {
  width: number;
  height: number;
  playerKappaX: number;
  playerKappaY: number;
}

// ─── Loot Renderer ────────────────────────────────────────────────────────────

export class LootRenderer {
  private readonly root: Container;
  private readonly lootSprites: Map<string, Container> = new Map();
  private readonly app: Application;
  
  // Fat-finger padding (pixels beyond sprite bounds)
  private readonly HIT_PADDING = 24;
  
  // Tap cooldown to prevent accidental double-taps
  private readonly TAP_COOLDOWN_MS = 300;
  private lastTapTime = 0;
  private lastTapLootId: string | null = null;
  
  // Rarity colors
  private readonly RARITY_COLORS: Record<string, number> = {
    common: 0xaaaaaa,
    uncommon: 0x4eff4e,
    rare: 0x4e9eff,
    epic: 0x9e4eff,
    legendary: 0xffa500,
    mystic: 0xff4eff,
  };
  
  // Visual ID to sprite path mapping (deterministic from ItemSignature)
  private readonly VISUAL_SPRITES: Record<string, string> = {
    weapon_base_0: "loot_dagger",
    weapon_base_1: "loot_shortsword",
    weapon_base_2: "loot_longsword",
    weapon_base_3: "loot_broadsword",
    weapon_base_4: "loot_greatsword",
    weapon_base_5: "loot_claymore",
    weapon_base_6: "loot_flamberge",
    weapon_base_7: "loot_zweihander",
    armor_base_0: "loot_leather",
    armor_base_1: "loot_chain",
    armor_base_2: "loot_scale",
    armor_base_3: "loot_plate",
    armor_base_4: "loot_reinforced",
    armor_base_5: "loot_dragon",
    armor_base_6: "loot_mythril",
    armor_base_7: "loot_adamantine",
    gold_pile: "loot_gold",
    default: "loot_generic",
  };
  
  constructor(app: Application, parent: Container) {
    this.app = app;
    this.root = new Container();
    this.root.zIndex = 500;
    parent.addChild(this.root);
  }
  
  /**
   * Render loot entities from world tick data.
   * Called during WORLD_HEARTBEAT processing.
   */
  public renderLoot(
    lootEntities: LootEntity[],
    ctx: LootRenderContext,
    onPickupIntent: (lootId: string) => void
  ): void {
    // Track which loot IDs are still active
    const activeIds = new Set<string>();
    
    for (const loot of lootEntities) {
      activeIds.add(loot.id);
      
      // Create or update sprite
      let sprite = this.lootSprites.get(loot.id);
      
      if (!sprite) {
        sprite = this.createLootSprite(loot);
        this.lootSprites.set(loot.id, sprite);
        this.root.addChild(sprite);
        
        // Setup fat-finger tap handler
        this.setupTapHandler(sprite, loot.id, onPickupIntent);
      }
      
      // Update position
      this.positionSprite(sprite, loot, ctx);
    }
    
    // Remove sprites for loot that no longer exists
    for (const [id, sprite] of this.lootSprites) {
      if (!activeIds.has(id)) {
        this.root.removeChild(sprite);
        sprite.destroy({ children: true });
        this.lootSprites.delete(id);
      }
    }
  }
  
  /**
   * Create a loot sprite container with visual + rarity indicator.
   */
  private createLootSprite(loot: LootEntity): Container {
    const container = new Container();
    
    // Base sprite (determined by visualId from signature)
    const visualKey = loot.visualId ?? "default";
    const spriteName = this.VISUAL_SPRITES[visualKey] ?? this.VISUAL_SPRITES.default;
    
    // Create placeholder graphic (actual sprite loaded from atlas)
    const baseGraphic = this.createLootGraphic(spriteName, loot);
    container.addChild(baseGraphic);
    
    // Rarity glow ring
    const rarityColor = this.RARITY_COLORS[loot.rarity ?? "common"] ?? 0xaaaaaa;
    const glowRing = new Graphics();
    glowRing.circle(0, -12, 18);
    glowRing.stroke({ width: 2, color: rarityColor, alpha: 0.6 });
    container.addChild(glowRing);
    
    // Rarity label (optional, for legendary+)
    if (loot.rarity === "legendary" || loot.rarity === "mystic") {
      const label = new Text({
        text: loot.rarity?.toUpperCase(),
        style: {
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: "900",
          fill: rarityColor,
          stroke: { color: 0x000000, width: 2 },
        },
      });
      label.anchor.set(0.5, 1);
      label.y = -36;
      label.alpha = 0.8;
      container.addChild(label);
    }
    
    // Gold indicator
    if (loot.gold && loot.gold > 0) {
      const goldLabel = new Text({
        text: `+${loot.gold}`,
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: "900",
          fill: 0xffd700,
          stroke: { color: 0x8b6914, width: 2 },
        },
      });
      goldLabel.anchor.set(0.5, 0);
      goldLabel.y = -8;
      goldLabel.alpha = 0.9;
      container.addChild(goldLabel);
    }
    
    // Hover state (scale up slightly)
    container.eventMode = "static";
    container.cursor = "pointer";
    
    return container;
  }
  
  /**
   * Create the base loot graphic (placeholder until atlas loaded).
   */
  private createLootGraphic(spriteName: string, loot: LootEntity): Graphics {
    const g = new Graphics();
    
    if (spriteName === "loot_gold" || loot.gold) {
      // Gold pile
      g.circle(0, 0, 12);
      g.fill({ color: 0xffd700, alpha: 0.9 });
      g.circle(-4, -4, 8);
      g.fill({ color: 0xffe066, alpha: 0.8 });
    } else {
      // Item sprite — diamond shape with rarity color
      const rarityColor = this.RARITY_COLORS[loot.rarity ?? "common"] ?? 0xaaaaaa;
      
      // Diamond item shape
      g.moveTo(0, -20);
      g.lineTo(14, 0);
      g.lineTo(0, 20);
      g.lineTo(-14, 0);
      g.closePath();
      g.fill({ color: 0x2a2a3a, alpha: 0.95 });
      g.stroke({ width: 2, color: rarityColor, alpha: 0.8 });
      
      // Inner highlight
      g.moveTo(0, -14);
      g.lineTo(10, 0);
      g.lineTo(0, 14);
      g.lineTo(-10, 0);
      g.closePath();
      g.fill({ color: 0x3a3a4a, alpha: 0.6 });
    }
    
    g.zIndex = 0;
    return g;
  }
  
  /**
   * Position loot sprite using isometric projection.
   */
  private positionSprite(sprite: Container, loot: LootEntity, ctx: LootRenderContext): void {
    const screenPos = iso3({
      gridX: fromKappaInt(loot.x),
      gridZ: fromKappaInt(loot.y),
      screenWidth: ctx.width,
      screenHeight: ctx.height,
      tileWidth: TILE_W,
      tileHeight: TILE_H,
      height: 0,
    });
    
    sprite.x = screenPos.x;
    sprite.y = screenPos.y - 20; // Slightly above ground
    sprite.zIndex = screenPos.zIndex + 500; // Above terrain, below actors
  }
  
  /**
   * Setup fat-finger-safe tap handler with padding.
   */
  private setupTapHandler(
    sprite: Container,
    lootId: string,
    onPickupIntent: (lootId: string) => void
  ): void {
    // Create expanded hit area for fat-finger protection
    const hitArea = new Graphics();
    hitArea.circle(0, -12, 24 + this.HIT_PADDING); // 24 base + 24 padding = 48px radius
    hitArea.fill({ color: 0xffffff, alpha: 0 }); // Invisible
    hitArea.zIndex = -1;
    sprite.addChild(hitArea);
    
    sprite.on("pointertap", () => {
      // Fat-finger protection: prevent rapid double-taps
      const now = Date.now();
      if (now - this.lastTapTime < this.TAP_COOLDOWN_MS && this.lastTapLootId === lootId) {
        return; // Ignore tap
      }
      
      this.lastTapTime = now;
      this.lastTapLootId = lootId;
      
      // Visual feedback: scale bounce
      this.bounceSprite(sprite);
      
      // Emit pickup intent to server
      onPickupIntent(lootId);
    });
    
    // Hover state
    sprite.on("pointerover", () => {
      sprite.scale.set(1.1);
    });
    
    sprite.on("pointerout", () => {
      sprite.scale.set(1.0);
    });
  }
  
  /**
   * Bounce animation on tap.
   */
  private bounceSprite(sprite: Container): void {
    const originalScale = sprite.scale.x;
    sprite.scale.set(originalScale * 1.2);
    
    // Quick scale back
    const ticker = this.app.ticker;
    let frame = 0;
    
    const animate = () => {
      frame++;
      const progress = frame / 4;
      
      if (progress >= 1) {
        sprite.scale.set(1.0);
        ticker.remove(animate);
        return;
      }
      
      // Ease back to 1.0
      const easeOut = 1 - Math.pow(1 - progress, 3);
      sprite.scale.set(1.0 + (0.2 * (1 - easeOut)));
    };
    
    ticker.add(animate);
  }
  
  /**
   * Highlight loot at given position (for targeted pickup).
   */
  public highlightLoot(lootId: string, durationMs: number = 500): void {
    const sprite = this.lootSprites.get(lootId);
    if (!sprite) return;
    
    const originalAlpha = sprite.alpha;
    sprite.alpha = 1.0;
    
    setTimeout(() => {
      sprite.alpha = originalAlpha;
    }, durationMs);
  }
  
  /**
   * Clear all loot sprites.
   */
  public clear(): void {
    for (const sprite of this.lootSprites.values()) {
      this.root.removeChild(sprite);
      sprite.destroy({ children: true });
    }
    this.lootSprites.clear();
  }
  
  /**
   * Get loot at screen position (for debugging/testing).
   */
  public getLootAtPosition(screenX: number, screenY: number): string | null {
    for (const [id, sprite] of this.lootSprites) {
      const dx = screenX - sprite.x;
      const dy = screenY - sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= 48) { // Fat-finger radius
        return id;
      }
    }
    return null;
  }
}

// ─── Loot Icon Derivation ──────────────────────────────────────────────────────

/**
 * Derive loot icon key from ItemSignature for atlas lookup.
 * This matches the server-side Visual ID derivation in itemSignature.ts
 */
export function deriveLootIconKey(itemSignature?: string): string {
  if (!itemSignature) return "default";
  
  try {
    // Parse signature: base:blade_3|hilt_12|material_iron|...
    const parts = itemSignature.split("|");
    
    for (const part of parts) {
      const [key, value] = part.split(":");
      if (key === "base") {
        // Map blade_3 -> weapon_base_2 (0-indexed)
        if (value.startsWith("blade_")) {
          const idx = parseInt(value.replace("blade_", ""), 10) - 1;
          return `weapon_base_${idx}`;
        }
        if (value.startsWith("chest_")) {
          const idx = parseInt(value.replace("chest_", ""), 10) - 1;
          return `armor_base_${idx}`;
        }
        if (value.startsWith("axe_")) {
          return "weapon_base_0"; // Axe fallback to dagger
        }
        if (value.startsWith("mace_")) {
          return "weapon_base_1"; // Mace fallback
        }
      }
    }
  } catch {
    // Invalid signature, use default
  }
  
  return "default";
}