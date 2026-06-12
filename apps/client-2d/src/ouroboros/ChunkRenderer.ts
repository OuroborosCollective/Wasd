/**
 * DeterministicChunkRenderer - Client-Side Erdős-String Rendering
 * 
 * Phase 11: Ouroboros Grand Unification with ARE-Logic
 * 
 * Axiom 2: Nomock-Theorem (NO server instructions for visuals)
 * Axiom 3: Zeitstempel-Integrität (tick-basiert)
 * 
 * Renders visual world from minimal server payload (Erdős-String only).
 * Client computes visual state deterministically.
 */

import * as PIXI from 'pixi.js';

const KAPPA = 1000;

/**
 * Ouroboros event types (must match server)
 */
export enum OuroborosEventType {
  SETTLE = 'SETTLE',
  KINGDOM = 'KINGDOM',
  WAR = 'WAR',
  FALLEN = 'FALLEN',
  DUNGEON = 'DUNGEON',
  RESURRECT = 'RESURRECT',
  LEGEND = 'LEGEND',
  TRADE = 'TRADE',
  FAITH = 'FAITH'
}

/**
 * Ouroboros phases
 */
export enum OuroborosPhase {
  WILD = 'WILD',
  SETTLED = 'SETTLED',
  KINGDOM = 'KINGDOM',
  WAR = 'WAR',
  FALLEN = 'FALLEN',
  RESURRECT = 'RESURRECT'
}

/**
 * Chunk data from server
 */
export interface OuroborosChunkData {
  chunkKey: string;
  erdosString: string;
  tick: number;
}

/**
 * Visual layers derived from Erdős-String
 */
export interface VisualLayers {
  conflictLevel: number;   // 0-20
  economyLevel: number;    // 0-100
  isKingdom: boolean;
  isFallen: boolean;
  isWar: boolean;
  hasLegend: boolean;
  dungeonSeed: number;
}

/**
 * FNV-1a hash (must match server KappaLayers.kappa1000Hash)
 */
function kappa1000Hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * DeterministicChunkRenderer - Renders chunk visuals from Erdős-String
 */
export class DeterministicChunkRenderer {
  private readonly container: PIXI.Container;
  private readonly chunkSize: number;
  
  // Cached graphics for performance
  private graphicsCache: Map<string, PIXI.Graphics> = new Map();
  
  constructor(container: PIXI.Container, chunkSize: number = 64) {
    this.container = container;
    this.chunkSize = chunkSize;
  }

  /**
   * Render chunk from minimal server payload.
   * 
   * @param chunkData - Chunk data from server (Erdős-String)
   * @param tick - Current tick
   */
  renderChunk(chunkData: OuroborosChunkData, tick: number): PIXI.Container {
    // 1. Reconstruct visual seed
    const visualSeed = kappa1000Hash(`${chunkData.erdosString}_${KAPPA}`);
    
    // 2. Derive visual layers
    const layers = this.deriveVisualLayers(chunkData.erdosString, visualSeed);
    
    // 3. Get or create chunk container
    const chunkContainer = this.getOrCreateChunkContainer(chunkData.chunkKey);
    
    // 4. Clear and redraw
    chunkContainer.removeChildren();
    
    // 5. Visual Emergence (no server instructions)
    if (layers.isFallen) {
      this.drawRuins(chunkContainer, visualSeed, layers);
    } else if (layers.isKingdom) {
      this.drawCity(chunkContainer, visualSeed, layers);
      if (layers.isWar) {
        this.drawSiegeEffects(chunkContainer, visualSeed, layers);
      }
    } else if (layers.hasLegend) {
      this.drawLegendaryLocation(chunkContainer, visualSeed, layers);
    } else {
      this.drawWilderness(chunkContainer, visualSeed, layers);
    }
    
    // 6. Draw dungeon if active
    if (layers.dungeonSeed > 0) {
      this.drawDungeon(chunkContainer, layers.dungeonSeed);
    }
    
    return chunkContainer;
  }

  /**
   * Derive visual layers from Erdős-String deterministically.
   */
  private deriveVisualLayers(erdosString: string, visualSeed: number): VisualLayers {
    // Parse events
    const events = this.parseErdosString(erdosString);
    
    // Track phase
    let phase = OuroborosPhase.WILD;
    let hasFallen = false;
    let hasWar = false;
    let hasKingdom = false;
    let hasLegend = false;
    let dungeonSeed = 0;
    
    for (const event of events) {
      switch (event.type) {
        case OuroborosEventType.SETTLE:
          phase = OuroborosPhase.SETTLED;
          break;
        case OuroborosEventType.KINGDOM:
          phase = OuroborosPhase.KINGDOM;
          hasKingdom = true;
          break;
        case OuroborosEventType.WAR:
          phase = OuroborosPhase.WAR;
          hasWar = true;
          break;
        case OuroborosEventType.FALLEN:
          phase = OuroborosPhase.FALLEN;
          hasFallen = true;
          dungeonSeed = event.data ? Number(event.data) : visualSeed;
          break;
        case OuroborosEventType.RESURRECT:
          phase = OuroborosPhase.RESURRECT;
          break;
        case OuroborosEventType.LEGEND:
          hasLegend = true;
          break;
      }
    }
    
    // Derive conflict level from visual seed
    const conflictLevel = erdosString.includes(OuroborosEventType.WAR) 
      ? 15 + (visualSeed % 5)
      : visualSeed % 20;
    
    // Derive economy level
    const economyLevel = (visualSeed >> 12) % 100;
    
    return {
      conflictLevel,
      economyLevel,
      isKingdom: hasKingdom,
      isFallen: hasFallen,
      isWar: hasWar,
      hasLegend,
      dungeonSeed
    };
  }

  /**
   * Parse Erdős-String events.
   */
  private parseErdosString(eventsStr: string): Array<{ type: OuroborosEventType; data?: string }> {
    if (!eventsStr || eventsStr.length === 0) return [];
    
    const events: Array<{ type: OuroborosEventType; data?: string }> = [];
    const parts = eventsStr.split('|');
    
    for (const part of parts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;
      
      const eventStr = part.slice(colonIdx + 1);
      
      // Check for known event types
      for (const type of Object.values(OuroborosEventType)) {
        if (eventStr.startsWith(type)) {
          const dataColonIdx = eventStr.indexOf(':');
          const data = dataColonIdx !== -1 ? eventStr.slice(dataColonIdx + 1) : undefined;
          events.push({ type, data });
          break;
        }
      }
    }
    
    return events;
  }

  /**
   * Get or create chunk container.
   */
  private getOrCreateChunkContainer(chunkKey: string): PIXI.Container {
    let container = this.graphicsCache.get(chunkKey);
    
    if (!container) {
      container = new PIXI.Container();
      container.label = chunkKey;
      this.container.addChild(container);
      this.graphicsCache.set(chunkKey, container);
    }
    
    // Parse chunk key for position
    const [cx, cz] = chunkKey.split(':').map(Number);
    container.x = cx * this.chunkSize;
    container.y = cz * this.chunkSize;
    
    return container;
  }

  /**
   * Draw wilderness (no events).
   */
  private drawWilderness(container: PIXI.Container, seed: number, layers: VisualLayers): void {
    const graphics = new PIXI.Graphics();
    
    // Base color from seed
    const greenShade = 100 + (seed % 50);
    const baseColor = 0x2d5a27 + (seed % 0x101010);
    
    graphics.rect(0, 0, this.chunkSize, this.chunkSize);
    graphics.fill({ color: baseColor });
    
    // Add some variation
    if (seed % 3 === 0) {
      // Tree clusters
      const treeCount = (seed % 5) + 1;
      for (let i = 0; i < treeCount; i++) {
        const tx = (seed >> i) % this.chunkSize;
        const ty = ((seed >> i) * 7) % this.chunkSize;
        this.drawTree(graphics, tx, ty, (seed >> i) % 0x202020);
      }
    }
    
    container.addChild(graphics);
  }

  /**
   * Draw city/kingdom.
   */
  private drawCity(container: PIXI.Container, seed: number, layers: VisualLayers): void {
    const graphics = new PIXI.Graphics();
    
    // City base
    const cityColor = 0x8b7355 + (layers.economyLevel > 70 ? 0x202000 : 0);
    graphics.rect(0, 0, this.chunkSize, this.chunkSize);
    graphics.fill({ color: cityColor });
    
    // City buildings
    const buildingCount = Math.floor(layers.economyLevel / 20) + 2;
    for (let i = 0; i < buildingCount; i++) {
      const bx = ((seed * (i + 1)) % (this.chunkSize - 10)) + 5;
      const by = (((seed * (i + 1)) * 7) % (this.chunkSize - 10)) + 5;
      const bw = 8 + ((seed >> i) % 8);
      const bh = 8 + ((seed >> i) % 12);
      
      const buildingColor = 0x696969 + ((seed >> (i * 2)) % 0x202020);
      graphics.rect(bx, by, bw, bh);
      graphics.fill({ color: buildingColor });
      graphics.stroke({ color: 0x333333, width: 1 });
    }
    
    // Walls if economy is high
    if (layers.economyLevel > 80) {
      graphics.rect(2, 2, this.chunkSize - 4, this.chunkSize - 4);
      graphics.stroke({ color: 0x8b4513, width: 3 });
    }
    
    container.addChild(graphics);
  }

  /**
   * Draw siege/war effects.
   */
  private drawSiegeEffects(container: PIXI.Container, seed: number, layers: VisualLayers): void {
    const graphics = new PIXI.Graphics();
    
    // Red overlay based on conflict level
    const intensity = layers.conflictLevel / 20;
    const redColor = Math.floor(0xff0000 * intensity);
    
    graphics.circle(
      this.chunkSize / 2,
      this.chunkSize / 2,
      10 + layers.conflictLevel
    );
    graphics.fill({ color: 0xff0000, alpha: 0.3 });
    
    // Fire/smoke particles
    for (let i = 0; i < layers.conflictLevel / 3; i++) {
      const px = ((seed * (i + 1)) % this.chunkSize);
      const py = ((seed * (i + 1) * 3) % this.chunkSize);
      graphics.circle(px, py, 2 + (i % 3));
      graphics.fill({ color: 0xff4500 });
    }
    
    container.addChild(graphics);
  }

  /**
   * Draw ruins (fallen state).
   */
  private drawRuins(container: PIXI.Container, seed: number, layers: VisualLayers): void {
    const graphics = new PIXI.Graphics();
    
    // Dark ruined ground
    graphics.rect(0, 0, this.chunkSize, this.chunkSize);
    graphics.fill({ color: 0x3d3d3d });
    
    // Broken walls
    for (let i = 0; i < 4; i++) {
      const rx = ((seed * (i + 1)) % (this.chunkSize - 15)) + 5;
      const ry = (((seed * (i + 1)) * 11) % (this.chunkSize - 15)) + 5;
      const rw = 5 + ((seed >> i) % 10);
      const rh = 3 + ((seed >> i) % 8);
      
      graphics.rect(rx, ry, rw, rh);
      graphics.fill({ color: 0x5a5a5a });
    }
    
    // Dark energy
    const darkIntensity = 0.3 + (layers.dungeonSeed % 20) / 100;
    graphics.circle(
      this.chunkSize / 2,
      this.chunkSize / 2,
      15 + (layers.dungeonSeed % 10)
    );
    graphics.fill({ color: 0x4a0080, alpha: darkIntensity });
    
    container.addChild(graphics);
  }

  /**
   * Draw legendary location.
   */
  private drawLegendaryLocation(container: PIXI.Container, seed: number, layers: VisualLayers): void {
    const graphics = new PIXI.Graphics();
    
    // Golden glow
    const glowRadius = 20 + (seed % 15);
    graphics.circle(this.chunkSize / 2, this.chunkSize / 2, glowRadius);
    graphics.fill({ color: 0xffd700, alpha: 0.3 });
    
    // Inner glow
    graphics.circle(this.chunkSize / 2, this.chunkSize / 2, glowRadius / 2);
    graphics.fill({ color: 0xffd700, alpha: 0.5 });
    
    // Sparkles
    for (let i = 0; i < 5; i++) {
      const angle = ((seed * (i + 1)) % 360) * (Math.PI / 180);
      const dist = 10 + ((seed >> i) % 15);
      const sx = this.chunkSize / 2 + Math.cos(angle) * dist;
      const sy = this.chunkSize / 2 + Math.sin(angle) * dist;
      
      graphics.circle(sx, sy, 2);
      graphics.fill({ color: 0xffff00 });
    }
    
    container.addChild(graphics);
  }

  /**
   * Draw dungeon marker.
   */
  private drawDungeon(container: PIXI.Container, dungeonSeed: number): void {
    const graphics = new PIXI.Graphics();
    
    // Dark portal
    const portalColor = 0x4a0080 + (dungeonSeed % 0x202020);
    graphics.circle(
      this.chunkSize / 2,
      this.chunkSize / 2,
      12 + (dungeonSeed % 8)
    );
    graphics.fill({ color: portalColor });
    
    // Swirling effect
    for (let i = 0; i < 3; i++) {
      const angle = ((dungeonSeed * (i + 1)) % 360) * (Math.PI / 180);
      const radius = 5 + (i * 3);
      const px = this.chunkSize / 2 + Math.cos(angle) * radius;
      const py = this.chunkSize / 2 + Math.sin(angle) * radius;
      
      graphics.circle(px, py, 2);
      graphics.fill({ color: 0x8b00ff });
    }
    
    container.addChild(graphics);
  }

  /**
   * Draw a tree.
   */
  private drawTree(graphics: PIXI.Graphics, x: number, y: number, shade: number): void {
    // Trunk
    graphics.rect(x - 1, y - 4, 3, 6);
    graphics.fill({ color: 0x4a3728 });
    
    // Foliage
    graphics.circle(x, y - 6, 5);
    graphics.fill({ color: 0x228b22 + shade });
  }

  /**
   * Clear all rendered chunks.
   */
  clearAll(): void {
    for (const container of this.graphicsCache.values()) {
      container.removeChildren();
      container.destroy({ children: true });
    }
    this.graphicsCache.clear();
  }

  /**
   * Remove specific chunk.
   */
  removeChunk(chunkKey: string): void {
    const container = this.graphicsCache.get(chunkKey);
    if (container) {
      container.destroy({ children: true });
      this.graphicsCache.delete(chunkKey);
    }
  }

  /**
   * Get cached chunk container.
   */
  getChunkContainer(chunkKey: string): PIXI.Container | undefined {
    return this.graphicsCache.get(chunkKey);
  }
}