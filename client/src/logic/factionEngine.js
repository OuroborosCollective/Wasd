/**
 * FactionEngine — strict deterministic 10Hz faction simulation helper.
 *
 * This module intentionally avoids Date.now(), Math.random(), floating point
 * accumulation in core maps, and non-stable iteration order. It is safe to run
 * on the authoritative world server at a fixed 10Hz cadence and also remains
 * backwards-compatible with the older client-side API shape.
 *
 * Coordinate convention: grid[x][y]
 */

export const FACTION_TICK_HZ = 10;
export const FACTION_SCALE = 1000;
export const FACTION_NEUTRAL_ID = null;

export const TERRAIN_MULTIPLIERS_FIXED = Object.freeze({
  mountain: Object.freeze({ gold: 2500, mana: 1200, food: 100, friction: 1500, defense: 1300 }),
  forest: Object.freeze({ gold: 500, mana: 1800, food: 1200, friction: 1200, defense: 1100 }),
  plains: Object.freeze({ gold: 1000, mana: 800, food: 2500, friction: 1000, defense: 1000 }),
  water: Object.freeze({ gold: 300, mana: 1500, food: 1800, friction: 1100, defense: 900 }),
  desert: Object.freeze({ gold: 1800, mana: 400, food: 200, friction: 1300, defense: 950 }),
  swamp: Object.freeze({ gold: 400, mana: 2000, food: 600, friction: 1600, defense: 1150 })
});

export const DEFAULT_TERRAIN_FIXED = Object.freeze({
  gold: 1000,
  mana: 1000,
  food: 1000,
  friction: 1000,
  defense: 1000
});

export class FactionEngine {
  constructor(gridSize, options = {}) {
    if (!Number.isInteger(gridSize) || gridSize <= 0) {
      throw new Error(`FactionEngine: gridSize must be a positive integer. Got ${gridSize}`);
    }

    this.gridSize = gridSize;
    this.tickHz = options.tickHz ?? FACTION_TICK_HZ;
    this.scale = options.scale ?? FACTION_SCALE;
    this.maxRadiusCap = options.maxRadiusCap ?? Math.max(8, Math.min(512, gridSize));
    this.minInfluence = options.minInfluence ?? 1;
    this.contestThreshold = options.contestThreshold ?? 80;
    this.frontierTaxPermille = options.frontierTaxPermille ?? 650;
    this.noisePermille = options.noisePermille ?? 20;
    this.noiseEpochTicks = options.noiseEpochTicks ?? this.tickHz * 10;
    this.claimDecayPermille = options.claimDecayPermille ?? 995;
    this.ownerHoldBonus = options.ownerHoldBonus ?? 32;
    this.allowBlockedInfluence = options.allowBlockedInfluence ?? false;

    this.terrainMultipliers = TERRAIN_MULTIPLIERS_FIXED;
    this.defaultTerrain = DEFAULT_TERRAIN_FIXED;

    this.traitMultipliers = Object.freeze({
      industrious: Object.freeze({ gold: 1200, mana: 1000, food: 1000, influence: 1025 }),
      magical: Object.freeze({ gold: 1000, mana: 1300, food: 1000, influence: 1010 }),
      agrarian: Object.freeze({ gold: 1000, mana: 1000, food: 1200, influence: 1000 }),
      nomadic: Object.freeze({ gold: 1000, mana: 1000, food: 1050, influence: 1040 }),
      militarist: Object.freeze({ gold: 1050, mana: 1000, food: 950, influence: 1075 }),
      druidic: Object.freeze({ gold: 900, mana: 1200, food: 1150, influence: 1015 }),
      mercantile: Object.freeze({ gold: 1150, mana: 1000, food: 1000, influence: 1000 }),
      isolationist: Object.freeze({ gold: 1000, mana: 1050, food: 1050, influence: 950 })
    });
  }

  simulateFactionTick({ factions, grid, leylineNodes = [], tick = 0, worldSeed = 1, previousInfluence = null }) {
    this.assertGrid(grid);

    const normalizedTick = this.normalizeTick(tick);
    const normalizedSeed = this.normalizeSeed(worldSeed);
    const cleanFactions = this.normalizeFactions(factions);
    const cleanLeylines = this.normalizeLeylines(leylineNodes);

    const leylineManaMap = this.calculateLeylineManaMap(cleanLeylines, grid);
    const influence = this.calculateInfluenceMap(cleanFactions, grid, {
      tick: normalizedTick,
      worldSeed: normalizedSeed,
      previousInfluence
    });

    const frontierCells = this.calculateFrontiers(influence.ownerMap, influence.contestedMap);
    const factionStats = this.calculateAllFactionYields(cleanFactions, influence, grid, leylineManaMap);
    const borderPressure = this.calculateBorderPressure(influence);
    const checksum = this.calculateInfluenceChecksum(influence, normalizedSeed, normalizedTick);

    return Object.freeze({
      tick: normalizedTick,
      tickHz: this.tickHz,
      worldSeed: normalizedSeed,
      checksum,
      ownerMap: influence.ownerMap,
      strengthMap: influence.strengthMap,
      secondStrengthMap: influence.secondStrengthMap,
      contestedMap: influence.contestedMap,
      leylineManaMap,
      frontierCells,
      factionStats,
      borderPressure
    });
  }

  calculateInfluenceMap(factions, grid, options = {}) {
    this.assertGrid(grid);

    const normalizedOptions = this.normalizeInfluenceOptions(options);
    const tick = normalizedOptions.tick;
    const worldSeed = normalizedOptions.worldSeed;
    const previousInfluence = normalizedOptions.previousInfluence;

    const ownerMap = this.createMap(() => FACTION_NEUTRAL_ID);
    const strengthMap = this.createMap(() => 0);
    const secondStrengthMap = this.createMap(() => 0);
    const contestedMap = this.createMap(() => false);

    const stableFactions = this.normalizeFactions(factions).sort((a, b) => a.id.localeCompare(b.id));

    for (const faction of stableFactions) {
      this.applyFactionInfluence({ faction, grid, ownerMap, strengthMap, secondStrengthMap, tick, worldSeed, previousInfluence });
    }

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (ownerMap[x][y] === FACTION_NEUTRAL_ID) continue;
        const diff = strengthMap[x][y] - secondStrengthMap[x][y];
        contestedMap[x][y] = secondStrengthMap[x][y] > 0 && diff <= this.contestThreshold;
      }
    }

    return Object.freeze({ ownerMap, strengthMap, secondStrengthMap, contestedMap });
  }

  applyFactionInfluence({ faction, grid, ownerMap, strengthMap, secondStrengthMap, tick, worldSeed, previousInfluence }) {
    const fx = this.clampInt(faction.x, 0, this.gridSize - 1);
    const fy = this.clampInt(faction.y, 0, this.gridSize - 1);
    const power = Math.max(0, Math.floor(faction.power));
    const expansionRate = Math.max(0, this.toFixed(faction.expansionRate));
    const traitInfluence = this.calculateTraitInfluencePermille(faction.traits);

    if (power <= 0 || expansionRate <= 0) return;

    const scaledPower = Math.floor((power * traitInfluence) / this.scale);
    const baseRadius = Math.floor((scaledPower * expansionRate) / this.scale);
    const maxRadius = this.clampInt(baseRadius, 1, this.maxRadiusCap);
    const maxRadiusSq = maxRadius * maxRadius;

    const minX = Math.max(0, fx - maxRadius);
    const maxX = Math.min(this.gridSize - 1, fx + maxRadius);
    const minY = Math.max(0, fy - maxRadius);
    const maxY = Math.min(this.gridSize - 1, fy + maxRadius);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const terrain = this.getTerrain(grid, x, y);
        if (terrain.blocked && !this.allowBlockedInfluence) continue;

        const dx = fx - x;
        const dy = fy - y;
        const distSq = dx * dx + dy * dy;
        if (distSq > maxRadiusSq) continue;

        const strength = this.calculateCellInfluenceStrength({
          faction,
          terrain,
          x,
          y,
          dx,
          dy,
          distSq,
          maxRadius,
          scaledPower,
          tick,
          worldSeed,
          previousInfluence
        });

        if (strength < this.minInfluence) continue;
        this.competeForCell({ factionId: faction.id, x, y, strength, ownerMap, strengthMap, secondStrengthMap, worldSeed });
      }
    }
  }

  calculateCellInfluenceStrength({ faction, terrain, x, y, distSq, maxRadius, scaledPower, tick, worldSeed, previousInfluence }) {
    const terrainData = this.getTerrainData(terrain.type);
    const distance = this.intSqrt(distSq);
    const effectiveDistance = Math.floor((distance * terrainData.friction) / this.scale);
    if (effectiveDistance > maxRadius) return 0;

    const falloff = this.scale - Math.floor((effectiveDistance * this.scale) / maxRadius);
    const defensePenalty = Math.max(1, terrainData.defense);
    let strength = Math.floor((scaledPower * falloff * this.scale) / (this.scale * defensePenalty));

    const epoch = Math.floor(tick / Math.max(1, this.noiseEpochTicks));
    const jitter = this.deterministicJitter({ worldSeed, epoch, factionId: faction.id, x, y });
    strength = Math.floor((strength * (this.scale + jitter)) / this.scale);

    const previousOwner = previousInfluence?.ownerMap?.[x]?.[y] ?? previousInfluence?.[x]?.[y]?.factionId ?? FACTION_NEUTRAL_ID;
    if (previousOwner === faction.id) {
      strength += this.ownerHoldBonus;
    } else if (previousOwner !== FACTION_NEUTRAL_ID) {
      strength = Math.floor((strength * this.claimDecayPermille) / this.scale);
    }

    return Math.max(0, strength);
  }

  competeForCell({ factionId, x, y, strength, ownerMap, strengthMap, secondStrengthMap, worldSeed }) {
    const currentOwner = ownerMap[x][y];
    const currentStrength = strengthMap[x][y];

    if (strength > currentStrength) {
      secondStrengthMap[x][y] = currentStrength;
      ownerMap[x][y] = factionId;
      strengthMap[x][y] = strength;
      return;
    }

    if (strength === currentStrength) {
      const oldScore = this.stableFactionCellScore(currentOwner, x, y, worldSeed);
      const newScore = this.stableFactionCellScore(factionId, x, y, worldSeed);

      if (newScore < oldScore) {
        secondStrengthMap[x][y] = currentStrength;
        ownerMap[x][y] = factionId;
        strengthMap[x][y] = strength;
      } else {
        secondStrengthMap[x][y] = Math.max(secondStrengthMap[x][y], strength);
      }
      return;
    }

    secondStrengthMap[x][y] = Math.max(secondStrengthMap[x][y], strength);
  }

  calculateAllFactionYields(factions, influence, grid, leylineManaMap = null) {
    const result = {};
    const stableFactions = this.normalizeFactions(factions).sort((a, b) => a.id.localeCompare(b.id));

    for (const faction of stableFactions) {
      result[faction.id] = this.calculateTotalYield(faction.id, influence, grid, leylineManaMap, faction.traits);
    }

    return result;
  }

  calculateTotalYield(factionId, influenceMap, grid, leylineNodesOrMap = [], factionTraits = {}) {
    this.assertGrid(grid);

    const influence = this.normalizeInfluenceResult(influenceMap);
    const leylineManaMap = this.normalizeLeylineInput(leylineNodesOrMap, grid);
    const total = { gold: 0, mana: 0, food: 0, cells: 0, contestedCells: 0, effectivePower: 0 };

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (influence.ownerMap[x][y] !== factionId) continue;

        const terrain = this.getTerrain(grid, x, y);
        if (terrain.blocked && !this.allowBlockedInfluence) continue;

        const terrainData = this.getTerrainData(terrain.type);
        const strength = influence.strengthMap[x][y];
        const isContested = influence.contestedMap[x][y];
        const claimMultiplier = isContested ? this.frontierTaxPermille : this.scale;
        const leylineMultiplier = leylineManaMap[x][y];

        total.gold += this.mulDiv(terrainData.gold, strength * claimMultiplier, this.scale * this.scale);
        total.food += this.mulDiv(terrainData.food, strength * claimMultiplier, this.scale * this.scale);
        total.mana += this.mulDiv(terrainData.mana, strength * leylineMultiplier * claimMultiplier, this.scale * this.scale * this.scale);

        total.cells += 1;
        total.effectivePower += strength;
        if (isContested) total.contestedCells += 1;
      }
    }

    return this.applyResourceBonus(total, factionTraits);
  }

  calculateLeylineManaMap(leylineNodes, grid) {
    this.assertGrid(grid);
    const manaMap = this.createMap(() => this.scale);
    const nodes = this.normalizeLeylines(leylineNodes).sort((a, b) => a.id.localeCompare(b.id));

    for (const node of nodes) {
      const radius = Math.max(1, Math.floor(node.influenceRadius));
      const radiusSq = radius * radius;
      const intensity = Math.max(0, this.toFixed(node.intensity));
      const minX = Math.max(0, node.x - radius);
      const maxX = Math.min(this.gridSize - 1, node.x + radius);
      const minY = Math.max(0, node.y - radius);
      const maxY = Math.min(this.gridSize - 1, node.y + radius);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          const terrain = this.getTerrain(grid, x, y);
          if (terrain.blocked && !this.allowBlockedInfluence) continue;

          const dx = node.x - x;
          const dy = node.y - y;
          const distSq = dx * dx + dy * dy;
          if (distSq > radiusSq) continue;

          const distance = this.intSqrt(distSq);
          const falloff = this.scale - Math.floor((distance * this.scale) / radius);
          const bonus = Math.floor((intensity * falloff) / this.scale);
          manaMap[x][y] += bonus;
        }
      }
    }

    return manaMap;
  }

  calculateFrontiers(ownerMap, contestedMap = null) {
    const frontierCells = [];

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const owner = ownerMap[x][y];
        if (owner === FACTION_NEUTRAL_ID) continue;

        let frontier = contestedMap?.[x]?.[y] === true;
        for (const neighbor of this.getNeighbors4(x, y)) {
          const otherOwner = ownerMap[neighbor.x][neighbor.y];
          if (otherOwner !== FACTION_NEUTRAL_ID && otherOwner !== owner) {
            frontier = true;
            break;
          }
        }

        if (frontier) {
          frontierCells.push(Object.freeze({ x, y, factionId: owner, contested: contestedMap?.[x]?.[y] === true }));
        }
      }
    }

    frontierCells.sort((a, b) => a.x - b.x || a.y - b.y || a.factionId.localeCompare(b.factionId));
    return frontierCells;
  }

  calculateBorderPressure(influenceMap) {
    const influence = this.normalizeInfluenceResult(influenceMap);
    const pressure = {};
    const frontiers = this.calculateFrontiers(influence.ownerMap, influence.contestedMap);

    for (const cell of frontiers) {
      if (!pressure[cell.factionId]) pressure[cell.factionId] = {};

      for (const neighbor of this.getNeighbors4(cell.x, cell.y)) {
        const other = influence.ownerMap[neighbor.x][neighbor.y];
        if (other !== FACTION_NEUTRAL_ID && other !== cell.factionId) {
          pressure[cell.factionId][other] = (pressure[cell.factionId][other] ?? 0) + 1;
        }
      }
    }

    return pressure;
  }

  buildClaimSnapshot(influenceMap) {
    const influence = this.normalizeInfluenceResult(influenceMap);
    const claims = [];

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const factionId = influence.ownerMap[x][y];
        if (factionId === FACTION_NEUTRAL_ID) continue;
        claims.push(Object.freeze({ x, y, factionId, strength: influence.strengthMap[x][y], contested: influence.contestedMap[x][y] }));
      }
    }

    return claims;
  }

  countOwnedCells(factionId, influenceMap) {
    const influence = this.normalizeInfluenceResult(influenceMap);
    let count = 0;

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        if (influence.ownerMap[x][y] === factionId) count++;
      }
    }

    return count;
  }

  getDominantFactionAt(x, y, influenceMap) {
    if (!this.inBounds(x, y)) return FACTION_NEUTRAL_ID;
    const influence = this.normalizeInfluenceResult(influenceMap);
    return influence.ownerMap[x][y];
  }

  getInfluenceStrengthAt(x, y, influenceMap) {
    if (!this.inBounds(x, y)) return 0;
    const influence = this.normalizeInfluenceResult(influenceMap);
    return influence.strengthMap[x][y];
  }

  isContestedAt(x, y, influenceMap) {
    if (!this.inBounds(x, y)) return false;
    const influence = this.normalizeInfluenceResult(influenceMap);
    return influence.contestedMap[x][y] === true;
  }

  applyResourceBonus(resources, factionTraits = {}) {
    let goldMul = this.scale;
    let manaMul = this.scale;
    let foodMul = this.scale;

    const entries = Object.entries(factionTraits ?? {}).sort(([a], [b]) => a.localeCompare(b));
    for (const [trait, active] of entries) {
      if (!active) continue;
      const traitData = this.traitMultipliers[trait];
      if (!traitData) continue;
      goldMul = Math.floor((goldMul * traitData.gold) / this.scale);
      manaMul = Math.floor((manaMul * traitData.mana) / this.scale);
      foodMul = Math.floor((foodMul * traitData.food) / this.scale);
    }

    return Object.freeze({
      ...resources,
      gold: Math.floor((resources.gold * goldMul) / this.scale),
      mana: Math.floor((resources.mana * manaMul) / this.scale),
      food: Math.floor((resources.food * foodMul) / this.scale)
    });
  }

  calculateInfluenceChecksum(influenceMap, worldSeed = 1, tick = 0) {
    const influence = this.normalizeInfluenceResult(influenceMap);
    let hash = this.hashString(`faction|${this.gridSize}|${this.normalizeSeed(worldSeed)}|${this.normalizeTick(tick)}`);

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const owner = influence.ownerMap[x][y] ?? 'neutral';
        const strength = influence.strengthMap[x][y] ?? 0;
        const contested = influence.contestedMap[x][y] ? 1 : 0;
        hash = this.hashString(`${hash}|${x}|${y}|${owner}|${strength}|${contested}`);
      }
    }

    return hash.toString(16).padStart(8, '0');
  }

  calculateTraitInfluencePermille(traits = {}) {
    let influence = this.scale;
    const entries = Object.entries(traits ?? {}).sort(([a], [b]) => a.localeCompare(b));
    for (const [trait, active] of entries) {
      if (!active) continue;
      const traitData = this.traitMultipliers[trait];
      if (!traitData) continue;
      influence = Math.floor((influence * traitData.influence) / this.scale);
    }
    return influence;
  }

  normalizeInfluenceOptions(options) {
    if (Number.isInteger(options)) {
      return Object.freeze({ tick: this.normalizeTick(options), worldSeed: 1, previousInfluence: null });
    }

    return Object.freeze({
      tick: this.normalizeTick(options?.tick ?? 0),
      worldSeed: this.normalizeSeed(options?.worldSeed ?? 1),
      previousInfluence: options?.previousInfluence ?? null
    });
  }

  normalizeInfluenceResult(influenceMap) {
    if (!influenceMap) {
      return Object.freeze({
        ownerMap: this.createMap(() => FACTION_NEUTRAL_ID),
        strengthMap: this.createMap(() => 0),
        contestedMap: this.createMap(() => false)
      });
    }

    if (influenceMap.ownerMap && influenceMap.strengthMap) {
      return Object.freeze({
        ownerMap: influenceMap.ownerMap,
        strengthMap: influenceMap.strengthMap,
        contestedMap: influenceMap.contestedMap ?? this.createMap(() => false)
      });
    }

    const ownerMap = this.createMap(() => FACTION_NEUTRAL_ID);
    const strengthMap = this.createMap(() => 0);
    const contestedMap = this.createMap(() => false);

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        const cell = influenceMap[x]?.[y];
        if (cell && typeof cell === 'object' && 'factionId' in cell) {
          ownerMap[x][y] = cell.factionId === undefined ? FACTION_NEUTRAL_ID : cell.factionId;
          strengthMap[x][y] = Math.max(0, Math.floor(cell.strength ?? 0));
          contestedMap[x][y] = Boolean(cell.contested);
        } else {
          ownerMap[x][y] = cell ?? FACTION_NEUTRAL_ID;
        }
      }
    }

    return Object.freeze({ ownerMap, strengthMap, contestedMap });
  }

  normalizeLeylineInput(leylineNodesOrMap, grid) {
    if (Array.isArray(leylineNodesOrMap) && Array.isArray(leylineNodesOrMap[0])) {
      return leylineNodesOrMap;
    }
    return this.calculateLeylineManaMap(leylineNodesOrMap ?? [], grid);
  }

  normalizeFactions(factions) {
    if (!Array.isArray(factions)) return [];

    return factions
      .filter(Boolean)
      .filter(faction => faction.id !== undefined && faction.id !== null)
      .map(faction => Object.freeze({
        id: String(faction.id),
        x: this.clampInt(faction.x ?? 0, 0, this.gridSize - 1),
        y: this.clampInt(faction.y ?? 0, 0, this.gridSize - 1),
        power: Math.max(0, Math.floor(faction.power ?? 0)),
        expansionRate: Number.isFinite(faction.expansionRate) ? faction.expansionRate : 1,
        traits: Object.freeze({ ...(faction.traits ?? {}) })
      }));
  }

  normalizeLeylines(leylineNodes) {
    if (!Array.isArray(leylineNodes)) return [];

    return leylineNodes
      .filter(Boolean)
      .map((node, index) => Object.freeze({
        id: String(node.id ?? `leyline_${index}`),
        x: this.clampInt(node.x ?? 0, 0, this.gridSize - 1),
        y: this.clampInt(node.y ?? 0, 0, this.gridSize - 1),
        influenceRadius: Math.max(1, Math.floor(node.influenceRadius ?? 1)),
        intensity: Number.isFinite(node.intensity) ? node.intensity : 1
      }));
  }

  normalizeTick(tick) {
    if (!Number.isFinite(tick)) return 0;
    return Math.max(0, Math.floor(tick));
  }

  normalizeSeed(seed) {
    if (Number.isInteger(seed)) return seed >>> 0;
    return this.hashString(String(seed ?? 1));
  }

  deterministicJitter({ worldSeed, epoch, factionId, x, y }) {
    if (this.noisePermille <= 0) return 0;
    const hash = this.hashString(`${worldSeed}|${epoch}|${factionId}|${x}|${y}`);
    const width = this.noisePermille * 2 + 1;
    return (hash % width) - this.noisePermille;
  }

  stableFactionCellScore(factionId, x, y, worldSeed) {
    if (factionId === FACTION_NEUTRAL_ID || factionId === undefined) return Number.MAX_SAFE_INTEGER;
    return this.hashString(`${worldSeed}|tie|${factionId}|${x}|${y}`);
  }

  hashString(input) {
    let hash = 2166136261;
    const text = String(input);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  intSqrt(value) {
    const n = Math.max(0, Math.floor(value));
    if (n < 2) return n;

    let x0 = n;
    let x1 = Math.floor((x0 + Math.floor(n / x0)) / 2);
    while (x1 < x0) {
      x0 = x1;
      x1 = Math.floor((x0 + Math.floor(n / x0)) / 2);
    }
    return x0;
  }

  toFixed(value) {
    if (!Number.isFinite(value)) return this.scale;
    return Math.floor(value * this.scale);
  }

  mulDiv(a, b, divisor) {
    return Math.floor((a * b) / divisor);
  }

  createMap(factory) {
    return Array.from({ length: this.gridSize }, (_, x) =>
      Array.from({ length: this.gridSize }, (_, y) => factory(x, y))
    );
  }

  getTerrain(grid, x, y) {
    return grid[x]?.[y] ?? { type: 'plains' };
  }

  getTerrainData(type) {
    return this.terrainMultipliers[type] ?? this.defaultTerrain;
  }

  getNeighbors4(x, y) {
    const result = [];
    if (x > 0) result.push(Object.freeze({ x: x - 1, y }));
    if (x < this.gridSize - 1) result.push(Object.freeze({ x: x + 1, y }));
    if (y > 0) result.push(Object.freeze({ x, y: y - 1 }));
    if (y < this.gridSize - 1) result.push(Object.freeze({ x, y: y + 1 }));
    return result;
  }

  inBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize;
  }

  clampInt(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, Math.floor(value)));
  }

  assertGrid(grid) {
    if (!Array.isArray(grid) || grid.length !== this.gridSize) {
      throw new Error(`FactionEngine: grid must be ${this.gridSize} columns wide.`);
    }

    for (let x = 0; x < this.gridSize; x++) {
      if (!Array.isArray(grid[x]) || grid[x].length !== this.gridSize) {
        throw new Error(`FactionEngine: grid[${x}] must be ${this.gridSize} rows high.`);
      }
    }
  }
}
