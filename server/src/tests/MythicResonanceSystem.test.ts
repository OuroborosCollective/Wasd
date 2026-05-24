import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import { MythicResonanceSystem } from '../modules/ouroboros/MythicResonanceSystem.js';
import { LegendDistiller } from '../modules/ouroboros/LegendDistiller.js';

describe('MythicResonanceSystem Integration', () => {
    it('should anchor participants when a legend is synthesized', async () => {
        const eventBus = new EventEmitter();
        const distiller = new LegendDistiller(eventBus);
        const resonanceSystem = new MythicResonanceSystem(eventBus);

        // Distill a quest to trigger legend_synthesized
        await distiller.distillQuest('Q-001', 90);

        const anchor = resonanceSystem.getAnchor('Held der Leere');
        expect(anchor).toBeDefined();
        expect(anchor?.data.legendId).toMatch(/^LGN-/);
        expect(anchor?.data.mythologicalWeight).toBeGreaterThan(0);
    });

    it('should trigger a resonance spike when participants are in proximity', async () => {
        const eventBus = new EventEmitter();
        const resonanceSystem = new MythicResonanceSystem(eventBus);
        const spikeSpy = vi.fn();
        eventBus.on('mythic_resonance_spike', spikeSpy);

        // Manually apply anchors for testing
        eventBus.emit('legend_synthesized', {
            legendId: 'LGN-TEST',
            participantIds: ['A', 'B'],
            mythologicalWeight: 50,
            impact: 80
        });

        const entities = [
            { id: 'A', position: { x: 0, y: 0, z: 0 } },
            { id: 'B', position: { x: 5, y: 0, z: 0 } } // Within 15 units
        ];

        resonanceSystem.update(entities);

        expect(spikeSpy).toHaveBeenCalled();
        const event = spikeSpy.mock.calls[0][0];
        expect(event.legendId).toBe('LGN-TEST');
        expect(event.entities).toContain('A');
        expect(event.entities).toContain('B');
        expect(event.spikeIntensity).toBe(50);

        // Check component data for renderer bridge
        const anchorA = resonanceSystem.getAnchor('A');
        expect(anchorA?.data.isResonating).toBe(true);
        expect(anchorA?.data.resonatingWith).toBe('B');
        expect(anchorA?.data.buffs).toContain('Transcendence');
    });

    it('should NOT trigger a resonance spike when participants are far apart', async () => {
        const eventBus = new EventEmitter();
        const resonanceSystem = new MythicResonanceSystem(eventBus);
        const spikeSpy = vi.fn();
        eventBus.on('mythic_resonance_spike', spikeSpy);

        eventBus.emit('legend_synthesized', {
            legendId: 'LGN-TEST',
            participantIds: ['A', 'B'],
            mythologicalWeight: 50,
            impact: 80
        });

        const entities = [
            { id: 'A', position: { x: 0, y: 0, z: 0 } },
            { id: 'B', position: { x: 20, y: 0, z: 0 } } // Outside 15 units
        ];

        resonanceSystem.update(entities);

        expect(spikeSpy).not.toHaveBeenCalled();
    });
});
