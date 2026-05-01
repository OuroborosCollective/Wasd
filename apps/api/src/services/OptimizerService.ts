import { Injectable } from '@nestjs/common';

export interface ScorableItem {
  id: string | number;
  [key: string]: any;
}

export interface WeightConfig {
  factor: string;
  weight: number;
  direction: 'asc' | 'desc';
}

export interface OptimizationResult<T> {
  item: T;
  score: number;
  breakdown: Record<string, number>;
}

@Injectable()
export class OptimizerService {
  /**
   * Optimizes a collection of items based on dynamic scoring criteria.
   * Logic calculates normalized values across the dataset to ensure fair weighting.
   */
  public optimize<T extends ScorableItem>(
    items: T[],
    configs: WeightConfig[],
    limit?: number
  ): OptimizationResult<T>[] {
    if (!items.length) return [];

    const stats = this.calculateStats(items, configs);
    
    const results: OptimizationResult<T>[] = items.map((item) => {
      const breakdown: Record<string, number> = {};
      let totalScore = 0;
      let totalWeight = 0;

      for (const config of configs) {
        const value = item[config.factor];
        if (typeof value !== 'number') continue;

        const normalized = this.normalize(
          value,
          stats[config.factor].min,
          stats[config.factor].max,
          config.direction
        );

        const weightedScore = normalized * config.weight;
        breakdown[config.factor] = weightedScore;
        totalScore += weightedScore;
        totalWeight += config.weight;
      }

      return {
        item,
        score: totalWeight > 0 ? totalScore / totalWeight : 0,
        breakdown,
      };
    });

    const sorted = results.sort((a, b) => b.score - a.score);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Normalizes a value to a range of 0 to 1 based on dataset boundaries.
   */
  private normalize(value: number, min: number, max: number, direction: 'asc' | 'desc'): number {
    if (max === min) return 1;
    
    const normalized = (value - min) / (max - min);
    return direction === 'desc' ? 1 - normalized : normalized;
  }

  /**
   * Pre-calculates min/max for each factor to allow relative normalization.
   */
  private calculateStats(items: any[], configs: WeightConfig[]): Record<string, { min: number; max: number }> {
    const stats: Record<string, { min: number; max: number }> = {};

    for (const config of configs) {
      const values = items
        .map((i) => i[config.factor])
        .filter((v): v is number => typeof v === 'number');

      if (values.length === 0) {
        stats[config.factor] = { min: 0, max: 0 };
        continue;
      }

      stats[config.factor] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return stats;
  }

  /**
   * Utility to calculate a single weighted average.
   */
  public calculateWeightedAverage(values: number[], weights: number[]): number {
    if (values.length !== weights.length || values.length === 0) return 0;

    const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
    const weightSum = weights.reduce((acc, w) => acc + w, 0);

    return weightSum === 0 ? 0 : sum / weightSum;
  }
}