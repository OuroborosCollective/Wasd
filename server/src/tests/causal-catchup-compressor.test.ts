import { describe, expect, it } from 'vitest';
import { compressCausalCatchup } from '../gameplay/CausalCatchupCompressor';

describe('CausalCatchupCompressor', () => {
  it('does not invent events for an empty list', () => {
    const summary = compressCausalCatchup([]);

    expect(summary.eventCount).toBe(0);
    expect(summary.events).toEqual([]);
    expect(summary.firstTick).toBeNull();
    expect(summary.lastTick).toBeNull();
    expect(summary.summaryHash).toBe('00000000');
  });

  it('drops unsupported or incomplete events instead of fabricating catchup truth', () => {
    const summary = compressCausalCatchup([
      { eventId: 'fake-1', type: 'not_supported', tick: 2, significancePerMille: 900 },
      { type: 'combat_result', tick: 2, significancePerMille: 900 },
      { eventId: 'real-1', type: 'combat_result', tick: 2, significancePerMille: 900, payloadHash: 'abc' },
    ]);

    expect(summary.eventCount).toBe(1);
    expect(summary.events[0].eventId).toBe('real-1');
    expect(summary.events[0].type).toBe('combat_result');
  });

  it('sorts summaries by tick, significance and event id', () => {
    const summary = compressCausalCatchup([
      { eventId: 'c', type: 'quest_completed', tick: 5, significancePerMille: 200 },
      { eventId: 'b', type: 'quest_completed', tick: 4, significancePerMille: 100 },
      { eventId: 'a', type: 'quest_completed', tick: 5, significancePerMille: 900 },
    ]);

    expect(summary.events.map((event) => event.eventId)).toEqual(['b', 'a', 'c']);
    expect(summary.firstTick).toBe(4);
    expect(summary.lastTick).toBe(5);
  });

  it('produces deterministic hashes for identical real events', () => {
    const events = [
      { eventId: 'market-1', type: 'market_price_changed', tick: 8, significancePerMille: 500, regionId: 'r1', chunkKey: '0:0', payloadHash: 'p1' },
      { eventId: 'legend-1', type: 'legend_recorded', tick: 9, significancePerMille: 1000, regionId: 'r1', chunkKey: '0:1', payloadHash: 'p2' },
    ];

    expect(compressCausalCatchup(events)).toEqual(compressCausalCatchup(events));
  });
});
