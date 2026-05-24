import { EventEmitter } from 'events';
import { MythicAnchorComponent, MythicResonanceEvent } from '@wasd/shared';

/**
 * MythicResonanceSystem
 *
 * Logic bridge that monitors entities with Mythic Anchors.
 * When entities from the same legend are in proximity, it triggers resonance spikes
 * that bridge systemic logic into the visual rendering via events.
 */
export class MythicResonanceSystem {
    private eventBus: EventEmitter;
    private anchors: Map<string, MythicAnchorComponent> = new Map();
    private readonly RESONANCE_DISTANCE_SQ = 15 * 15; // 15 units radius

    constructor(eventBus: EventEmitter) {
        this.eventBus = eventBus;
        this.setupListeners();
    }

    private setupListeners(): void {
        this.eventBus.on('legend_synthesized', (data: {
            legendId: string;
            participantIds: string[];
            mythologicalWeight: number;
            impact: number;
        }) => {
            this.applyAnchorsToParticipants(data);
        });
    }

    private applyAnchorsToParticipants(data: {
        legendId: string;
        participantIds: string[];
        mythologicalWeight: number;
        impact: number;
    }): void {
        for (const id of data.participantIds) {
            const anchor: MythicAnchorComponent = {
                type: 'MythicAnchor',
                data: {
                    legendId: data.legendId,
                    mythologicalWeight: data.mythologicalWeight,
                    resonanceFactor: data.impact / 100,
                    participantIds: data.participantIds,
                    isResonating: false
                }
            };
            this.anchors.set(id, anchor);
        }
    }

    /**
     * Tick function called by the world engine.
     * Checks for proximity between participants of the same legend.
     */
    public update(entities: Array<{ id: string; position: { x: number; y: number; z: number } }>): void {
        const legendGroups = new Map<string, string[]>();

        // Reset resonance states
        for (const anchor of this.anchors.values()) {
            anchor.data.isResonating = false;
            anchor.data.resonatingWith = undefined;
            anchor.data.buffs = anchor.data.buffs?.filter(b => b !== 'Transcendence');
        }

        // 1. Group entities by legendId
        for (const entity of entities) {
            const anchor = this.anchors.get(entity.id);
            if (anchor) {
                const lid = anchor.data.legendId;
                if (!legendGroups.has(lid)) legendGroups.set(lid, []);
                legendGroups.get(lid)!.push(entity.id);
            }
        }

        // 2. Check proximity within groups
        for (const [legendId, participantIds] of legendGroups.entries()) {
            if (participantIds.length < 2) continue;

            for (let i = 0; i < participantIds.length; i++) {
                for (let j = i + 1; j < participantIds.length; j++) {
                    const idA = participantIds[i];
                    const idB = participantIds[j];
                    const entA = entities.find(e => e.id === idA);
                    const entB = entities.find(e => e.id === idB);

                    if (!entA || !entB) continue;

                    const dx = entA.position.x - entB.position.x;
                    const dy = entA.position.y - entB.position.y;
                    const dz = entA.position.z - entB.position.z;
                    const distSq = dx * dx + dy * dy + dz * dz;

                    if (distSq < this.RESONANCE_DISTANCE_SQ) {
                        this.triggerResonanceSpike(idA, idB, legendId, entA.position);
                    }
                }
            }
        }
    }

    private triggerResonanceSpike(idA: string, idB: string, legendId: string, position: { x: number; y: number; z: number }): void {
        const anchorA = this.anchors.get(idA)!;
        const anchorB = this.anchors.get(idB)!;

        // Update states for bridging to renderer
        anchorA.data.isResonating = true;
        anchorA.data.resonatingWith = idB;
        anchorA.data.buffs = [...(anchorA.data.buffs || []), 'Transcendence'];

        anchorB.data.isResonating = true;
        anchorB.data.resonatingWith = idA;
        anchorB.data.buffs = [...(anchorB.data.buffs || []), 'Transcendence'];

        // Visual/Systemic intensity based on combined mythological weight
        const intensity = (anchorA.data.mythologicalWeight + anchorB.data.mythologicalWeight) / 2;

        const event: MythicResonanceEvent = {
            type: 'mythic_resonance_spike',
            entities: [idA, idB],
            legendId: legendId,
            spikeIntensity: intensity,
            position: position
        };

        this.eventBus.emit('mythic_resonance_spike', event);

        // Log to causal history (simulated)
        console.log(`[MythicResonance] Spike detected between ${idA} and ${idB} for Legend ${legendId}`);
    }

    public getAnchor(entityId: string): MythicAnchorComponent | undefined {
        return this.anchors.get(entityId);
    }
}
