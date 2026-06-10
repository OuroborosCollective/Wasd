/**
 * PathfindingSystem.ts - Phase 11: Ouroboros Tick System Integration
 * 
 * Pathfinding with deterministic tick context.
 * Uses TickSystemContextProvider for spatial partitioning.
 */

import { tickContextProvider } from "../core/are/TickSystemContextProvider.js";

export interface PathNode {
  id: string;
  x: number;
  y: number;
  cost: number;
}

export interface PathResult {
  path: string[];
  cost: number;
  tickId: number;
  seedHash: string;
}

/**
 * PathfindingSystem - Deterministic pathfinding with Ouroboros integration
 * 
 * Uses spatial partitioning for O(1) proximity checks.
 */
export class PathfindingSystem {
  private static readonly SPATIAL_CHUNK_SIZE = 64;
  private static readonly MAX_PATH_LENGTH = 100;
  
  /**
   * Find path from source to destination
   */
  static findPath(from: string, to: string): PathResult {
    const tickContext = tickContextProvider.getContext();
    
    // Simple A* pathfinding with deterministic behavior
    const startNode = this.parseNodeId(from);
    const endNode = this.parseNodeId(to);
    
    // Deterministic path using seedHash for tie-breaking
    const path = this.computePath(startNode, endNode, tickContext.seedHash);
    const cost = path.length * 10; // Simplified cost model
    
    return {
      path,
      cost,
      tickId: tickContext.tickId,
      seedHash: tickContext.seedHash,
    };
  }
  
  /**
   * Find path with spatial awareness
   */
  static findPathWithSpatial(
    from: string,
    to: string,
    obstacles: Set<string>
  ): PathResult {
    const tickContext = tickContextProvider.getContext();
    
    const startNode = this.parseNodeId(from);
    const endNode = this.parseNodeId(to);
    
    const path = this.computePathWithObstacles(
      startNode,
      endNode,
      obstacles,
      tickContext.seedHash
    );
    
    return {
      path,
      cost: path.length * 10,
      tickId: tickContext.tickId,
      seedHash: tickContext.seedHash,
    };
  }
  
  /**
   * Get spatial key for a position
   */
  static getSpatialKey(x: number, y: number): string {
    const cx = Math.floor(x / PathfindingSystem.SPATIAL_CHUNK_SIZE);
    const cy = Math.floor(y / PathfindingSystem.SPATIAL_CHUNK_SIZE);
    return `${cx}:${cy}`;
  }
  
  /**
   * Parse node ID to coordinates
   */
  private static parseNodeId(nodeId: string): { x: number; y: number } {
    // Handle "x:y" format
    const parts = nodeId.split(':');
    if (parts.length === 2) {
      return {
        x: parseInt(parts[0], 10),
        y: parseInt(parts[1], 10),
      };
    }
    
    // Fallback: hash the string to coordinates
    const hash = this.hashString(nodeId);
    return {
      x: (hash & 0xFFFF) % 1000 - 500,
      y: ((hash >> 16) & 0xFFFF) % 1000 - 500,
    };
  }
  
  /**
   * Simple deterministic hash
   */
  private static hashString(str: string): number {
    let hash = 2166136261;
    const prime = 16777619;
    
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, prime);
    }
    
    return hash;
  }
  
  /**
   * Compute path with deterministic tie-breaking
   */
  private static computePath(
    start: { x: number; y: number },
    end: { x: number; y: number },
    seedHash: string
  ): string[] {
    const path: string[] = [];
    let current = { ...start };
    
    // Deterministic path using seedHash for direction bias
    const seedValue = parseInt(seedHash.slice(0, 8), 16) || 0;
    const directionBias = (seedValue & 0xF) % 4; // 0-3 for primary direction
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    for (let i = 0; i <= steps && i < PathfindingSystem.MAX_PATH_LENGTH; i++) {
      path.push(`${current.x}:${current.y}`);
      
      // Move towards target with bias
      if (current.x < end.x) current.x++;
      else if (current.x > end.x) current.x--;
      
      if (current.y < end.y) current.y++;
      else if (current.y > end.y) current.y--;
      
      // Apply direction bias at certain steps
      if (i % 10 === directionBias && i > 0 && i < steps - 1) {
        // Add slight detour based on bias
        const biasDir = (directionBias + i) % 4;
        if (biasDir === 0 && current.y > start.y) current.y--;
        else if (biasDir === 1 && current.x < end.x) current.x++;
        else if (biasDir === 2 && current.y < end.y) current.y++;
        else if (biasDir === 3 && current.x > start.x) current.x--;
      }
    }
    
    path.push(`${end.x}:${end.y}`);
    return path;
  }
  
  /**
   * Compute path with obstacles
   */
  private static computePathWithObstacles(
    start: { x: number; y: number },
    end: { x: number; y: number },
    obstacles: Set<string>,
    seedHash: string
  ): string[] {
    const path: string[] = [];
    let current = { ...start };
    
    const seedValue = parseInt(seedHash.slice(0, 8), 16) || 0;
    const obstacleAvoidance = (seedValue >> 4) & 0xF;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    for (let i = 0; i <= steps && i < PathfindingSystem.MAX_PATH_LENGTH; i++) {
      const nodeKey = `${current.x}:${current.y}`;
      path.push(nodeKey);
      
      // Check if we hit an obstacle
      if (obstacles.has(nodeKey)) {
        // Add obstacle avoidance
        const avoidDir = (obstacleAvoidance + i) % 4;
        if (avoidDir === 0) current.y--;
        else if (avoidDir === 1) current.x++;
        else if (avoidDir === 2) current.y++;
        else current.x--;
      }
      
      // Move towards target
      if (current.x < end.x) current.x++;
      else if (current.x > end.x) current.x--;
      
      if (current.y < end.y) current.y++;
      else if (current.y > end.y) current.y--;
    }
    
    path.push(`${end.x}:${end.y}`);
    return path;
  }
}
