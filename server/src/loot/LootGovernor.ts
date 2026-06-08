'use strict';

interface GovernorPolicy {
  maxSellValue?: number;
  maxAffixes?: number;
  maxSingleStatValue?: number;
  forbiddenStats?: string[];
}

interface InspectionResult {
  ok: boolean;
  warnings: Array<{ code: string; stat?: string; value?: any }>;
}

class LootGovernor {
  private policy: Required<GovernorPolicy>;

  constructor(policy: GovernorPolicy = {}) {
    this.policy = {
      maxSellValue: policy.maxSellValue ?? 1_000_000,
      maxAffixes: policy.maxAffixes ?? 10,
      maxSingleStatValue: policy.maxSingleStatValue ?? 10_000,
      forbiddenStats: policy.forbiddenStats ?? ['adminPower', 'serverAuthority', 'realMoneyValue'],
    };
  }

  inspect(item: any): InspectionResult {
    const warnings: Array<{ code: string; stat?: string; value?: any }> = [];

    if ((item.affixes?.length || 0) > this.policy.maxAffixes) {
      warnings.push({
        code: 'TOO_MANY_AFFIXES',
        value: item.affixes.length
      });
    }

    for (const [stat, value] of Object.entries(item.attributes || {})) {
      if (this.policy.forbiddenStats.includes(stat)) {
        warnings.push({
          code: 'FORBIDDEN_STAT',
          stat
        });
      }

      if (Number(value) > this.policy.maxSingleStatValue) {
        warnings.push({
          code: 'STAT_TOO_HIGH',
          stat,
          value
        });
      }
    }

    if ((item.economy?.sellValue || 0) > this.policy.maxSellValue) {
      warnings.push({
        code: 'SELL_VALUE_TOO_HIGH',
        value: item.economy.sellValue
      });
    }

    return {
      ok: warnings.length === 0,
      warnings
    };
  }

  sanitize(item: any): any {
    const cleanAttributes: Record<string, number> = {};

    for (const [stat, value] of Object.entries(item.attributes || {})) {
      if (this.policy.forbiddenStats.includes(stat)) continue;

      cleanAttributes[stat] = Math.min(
        this.policy.maxSingleStatValue,
        Math.max(0, Math.floor(Number(value || 0)))
      );
    }

    const affixes = (item.affixes || []).slice(0, this.policy.maxAffixes);

    return Object.freeze({
      ...item,
      attributes: Object.freeze(cleanAttributes),
      affixes: Object.freeze(affixes),
      economy: Object.freeze({
        ...(item.economy || {}),
        sellValue: Math.min(
          this.policy.maxSellValue,
          Math.max(1, Math.floor(Number(item.economy?.sellValue || 1)))
        )
      })
    });
  }
}

export { LootGovernor };