/**
 * LogicGridCompiler - ARE-Logic Sandbox
 * 
 * Web-based sandbox for investor demonstrations.
 * Implements Stateless Determinism: same input + same rules = same output.
 * Uses kappaPos for O(1) lookups.
 * 10-Hz tick processing in browser.
 * Generates identical chain-strings as server backend.
 * 
 * Features:
 * - AREStateCompiler port
 * - kappaPos for O(1) lookups
 * - 10-Hz tick processing
 * - Identical chain-string generation
 * - Stateless determinism
 */

import { EventEmitter } from 'events';

export type LogicValue = number | string | boolean | null;

export interface LogicCell {
  kappaPos: number;
  type: string;
  state: LogicValue;
  attributes: Record<string, unknown>;
}

export type LogicGrid = LogicCell[][];
export type LogicGridRow = LogicCell[];

export interface RuleContext {
  x: number;
  y: number;
  width: number;
  height: number;
  iteration: number;
  tickIndex: number;
}

export interface LogicRule {
  name: string;
  priority: number;
  selector: (cell: LogicCell) => boolean;
  apply: (cell: LogicCell, neighbors: LogicCell[], context: RuleContext) => LogicCell;
}

export interface ChainOutput {
  chain: string;
  iteration: number;
  timestamp: number;
  checksum: string;
}

export interface TickStats {
  iteration: number;
  tickRate: number;
  activeCells: number;
  processedCells: number;
  chainLength: number;
}

const DEFAULT_RULES: LogicRule[] = [
  { name: 'energy_decay', priority: 100, selector: (c) => c.type === 'energy', apply: (c) => ({ ...c, state: typeof c.state === 'number' ? Math.max(0, c.state as number - 0.1) : 0 }) },
  { name: 'resonance_propagate', priority: 50, selector: (c) => c.type === 'resonance', apply: (c) => ({ ...c, state: typeof c.state === 'number' ? (c.state as number + 0.05) % 1.0 : 0 }) }
];

const TICK_INTERVAL_MS = 100;
const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 64;

export class LogicGridCompiler extends EventEmitter {
  private grid: LogicGrid = [];
  private iteration: number = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private tickRate: number = 0;
  private lastTickTime: number = 0;
  private readonly width: number;
  private readonly height: number;

  constructor(width: number = DEFAULT_WIDTH, height: number = DEFAULT_HEIGHT) {
    super();
    this.width = width;
    this.height = height;
  }

  /** Calculate kappaPos for O(1) lookup */
  public calculateKappaPos(x: number, y: number): number {
    return y * this.width + x;
  }

  /** Get cell by kappaPos (O(1)) */
  public getCellByKappaPos(kappaPos: number): LogicCell | null {
    if (kappaPos < 0 || kappaPos >= this.width * this.height) return null;
    const y = Math.floor(kappaPos / this.width);
    const x = kappaPos % this.width;
    return this.grid[y]?.[x] ?? null;
  }

  /** Get cell by coordinates (O(1) via kappaPos) */
  public getCell(x: number, y: number): LogicCell | null {
    return this.getCellByKappaPos(this.calculateKappaPos(x, y));
  }

  /** Compile grid with rules - Stateless determinism */
  public compile(rules: LogicRule[] = DEFAULT_RULES): LogicGrid {
    if (!this.grid.length) return [];
    const nextGrid: LogicGrid = [];
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (let y = 0; y < this.height; y++) {
      const row: LogicGridRow = [];
      for (let x = 0; x < this.width; x++) {
        const currentCell = this.grid[y][x];
        const neighbors = this.getNeighbors(x, y);
        const context: RuleContext = { x, y, width: this.width, height: this.height, iteration: this.iteration, tickIndex: this.iteration };
        let nextCell: LogicCell = { kappaPos: currentCell.kappaPos, type: currentCell.type, state: currentCell.state, attributes: { ...currentCell.attributes } };
        for (const rule of sortedRules) {
          if (rule.selector(nextCell)) nextCell = rule.apply(nextCell, neighbors, context);
        }
        row.push(nextCell);
      }
      nextGrid.push(row);
    }
    this.grid = nextGrid;
    this.iteration++;
    return nextGrid;
  }

  private getNeighbors(x: number, y: number): LogicCell[] {
    const neighbors: LogicCell[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) neighbors.push(this.grid[ny][nx]);
      }
    }
    return neighbors;
  }

  /** Generate chain-string (identical to server) */
  public generateChainString(): ChainOutput {
    let activeCount = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y]?.[x];
        if (cell && (cell.type === 'resonance' || cell.type === 'energy')) activeCount++;
      }
    }
    const timestamp = Date.now();
    const resonance = activeCount / (this.width * this.height);
    const phaseShift = (this.iteration % 100) / 100;
    const aggression = 1.0 - resonance;
    const faith = resonance * 0.5;
    const chain = `${resonance.toFixed(4)}|${phaseShift.toFixed(4)}|${aggression.toFixed(4)}|${faith.toFixed(4)}|${timestamp}`;
    return { chain, iteration: this.iteration, timestamp, checksum: this.checksum() };
  }

  public checksum(): string {
    let hash = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        hash = ((hash << 5) - hash + (cell.kappaPos || 0)) | 0;
      }
    }
    return hash.toString(16);
  }

  /** Seed grid */
  public seed(defaultType: string = 'void'): LogicGrid {
    this.iteration = 0;
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: LogicGridRow = [];
      for (let x = 0; x < this.width; x++) {
        row.push({ kappaPos: this.calculateKappaPos(x, y), type: defaultType, state: 0, attributes: {} });
      }
      this.grid.push(row);
    }
    return this.grid;
  }

  /** Start 10-Hz tick processing */
  public startTicks(): void {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      this.tickRate = 1000 / (now - this.lastTickTime);
      this.lastTickTime = now;
      this.compile();
      const chainOutput = this.generateChainString();
      this.emit('tick', { iteration: this.iteration, chain: chainOutput.chain, stats: this.getTickStats() });
    }, TICK_INTERVAL_MS);
  }

  /** Stop 10-Hz tick processing */
  public stopTicks(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  public getTickStats(): TickStats {
    let activeCells = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y]?.[x];
        if (cell?.type !== 'void') activeCells++;
      }
    }
    return { iteration: this.iteration, tickRate: this.tickRate, activeCells, processedCells: this.width * this.height, chainLength: this.generateChainString().chain.length };
  }

  public getGrid(): LogicGrid { return this.grid; }
  public getIteration(): number { return this.iteration; }
  public reset(): void { this.iteration = 0; }

  public static checksum(grid: LogicGrid): string {
    let hash = 0;
    const s = JSON.stringify(grid);
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
    }
    return hash.toString(16);
  }
}

export default LogicGridCompiler;
export { TICK_INTERVAL_MS, DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_RULES };
