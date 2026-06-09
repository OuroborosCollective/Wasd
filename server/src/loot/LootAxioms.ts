'use strict';

import crypto from 'node:crypto';

const LootAxioms = Object.freeze({
  VERSION: 'ARE_LOOT_AXIOMS_V3_MUTATION',

  assertContext(ctx) {
    if (!ctx) throw new Error('LOOT_CONTEXT_MISSING');
    if (!ctx.playerId) throw new Error('LOOT_PLAYER_ID_MISSING');
    if (!Number.isInteger(ctx.tickIndex)) throw new Error('LOOT_TICK_INDEX_INVALID');
    if (!ctx.dropSourceId) throw new Error('LOOT_SOURCE_ID_MISSING');
    if (!Number.isInteger(ctx.areaLevel)) throw new Error('LOOT_AREA_LEVEL_INVALID');
    if (!Number.isInteger(ctx.lootIndex)) throw new Error('LOOT_INDEX_INVALID');
  },

  makeSeed(ctx) {
    this.assertContext(ctx);

    return [
      this.VERSION,
      `policy:${ctx.policyVersion || 'default'}`,
      `player:${ctx.playerId}`,
      `tick:${ctx.tickIndex}`,
      `source:${ctx.dropSourceId}`,
      `area:${ctx.areaLevel}`,
      `loot:${ctx.lootIndex}`,
      `biome:${ctx.biomeId || 'unknown'}`,
      `faction:${ctx.factionId || 'neutral'}`,
      `social:${ctx.socialString || 'none'}`
    ].join('|');
  },

  stableHash(value) {
    const stable = JSON.stringify(this.sortDeep(value));
    return crypto.createHash('sha256').update(stable).digest('hex');
  },

  shortHash(value, length = 16) {
    return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
  },

  sortDeep(value) {
    if (Array.isArray(value)) {
      return value.map((v) => this.sortDeep(v));
    }

    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc, key) => {
          acc[key] = this.sortDeep(value[key]);
          return acc;
        }, {});
    }

    return value;
  }
});

export { LootAxioms };