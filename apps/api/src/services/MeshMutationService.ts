import { Injectable, Logger } from '@nestjs/common';
import { VPSAutonomousOperationService } from './VPSAutonomousOperationService';
import { LoreNarrativeEngine } from './LoreNarrativeEngine';
import { SocketGateway } from '../gateways/SocketGateway';
import { WorldStateService } from './WorldStateService';

export enum NarrativeTrigger {
  CORRUPTION = 'CORRUPTION',
  GROWTH = 'GROWTH',
  VOID_INCURSION = 'VOID_INCURSION',
  SANCTIFICATION = 'SANCTIFICATION',
  ANCIENT_AWAKENING = 'ANCIENT_AWAKENING'
}

export interface ShaderMutationParams {
  vertexDisplacement: number;
  textureLerp: number;
  emissiveIntensity: number;
  colorShift: [number, number, number];
  dissolveThreshold: number;
}

export interface MeshMutationState {
  entityId: string;
  trigger: NarrativeTrigger;
  intensity: number;
  params: ShaderMutationParams;
  timestamp: number;
}

@Injectable()
export class MeshMutationService {
  private readonly logger = new Logger(MeshMutationService.name);

  constructor(
    private readonly vpsService: VPSAutonomousOperationService,
    private readonly loreEngine: LoreNarrativeEngine,
    private readonly socketGateway: SocketGateway,
    private readonly worldState: WorldStateService
  ) {}

  /**
   * Applies a narrative-driven mutation to a specific 3D asset/entity.
   * This bridges the LoreNarrativeEngine logic with physical 3D representation.
   */
  async applyNarrativeMutation(
    entityId: string, 
    trigger: NarrativeTrigger, 
    intensity: number = 1.0
  ): Promise<MeshMutationState> {
    this.logger.log(`Applying mutation ${trigger} to entity ${entityId} with intensity ${intensity}`);

    const params = this.calculateShaderParameters(trigger, intensity);
    
    const mutation: MeshMutationState = {
      entityId,
      trigger,
      intensity,
      params,
      timestamp: Date.now(),
    };

    // 1. Persist to World State and VPS for long-term consistency
    await this.syncToPersistentStorage(mutation);

    // 2. Stream to connected clients via WebSocket for real-time visual updates
    this.broadcastToFrontend(mutation);

    return mutation;
  }

  /**
   * Calculates specific shader parameters based on the narrative trigger.
   * These values are interpreted by the Three.js CustomShaderMaterial on the client.
   */
  private calculateShaderParameters(trigger: NarrativeTrigger, intensity: number): ShaderMutationParams {
    switch (trigger) {
      case NarrativeTrigger.CORRUPTION:
        return {
          vertexDisplacement: 0.15 * intensity,
          textureLerp: 0.8 * intensity,
          emissiveIntensity: 2.5 * intensity,
          colorShift: [0.4, 0.0, 0.5], // Deep Purple
          dissolveThreshold: 0.1 * intensity
        };
      case NarrativeTrigger.GROWTH:
        return {
          vertexDisplacement: 0.05 * intensity,
          textureLerp: 0.4 * intensity,
          emissiveIntensity: 1.2 * intensity,
          colorShift: [0.1, 0.8, 0.2], // Organic Green
          dissolveThreshold: 0.0
        };
      case NarrativeTrigger.VOID_INCURSION:
        return {
          vertexDisplacement: 0.4 * intensity,
          textureLerp: 1.0 * intensity,
          emissiveIntensity: 5.0 * intensity,
          colorShift: [0.0, 0.0, 0.0], // Void Black
          dissolveThreshold: 0.3 * intensity
        };
      case NarrativeTrigger.SANCTIFICATION:
        return {
          vertexDisplacement: 0.02 * intensity,
          textureLerp: 0.2 * intensity,
          emissiveIntensity: 3.0 * intensity,
          colorShift: [0.9, 0.9, 1.0], // Holy White/Blue
          dissolveThreshold: -0.1
        };
      case NarrativeTrigger.ANCIENT_AWAKENING:
        return {
          vertexDisplacement: 0.1 * intensity,
          textureLerp: 0.5 * intensity,
          emissiveIntensity: 1.8 * intensity,
          colorShift: [0.8, 0.5, 0.1], // Amber/Gold
          dissolveThreshold: 0.05
        };
      default:
        return {
          vertexDisplacement: 0,
          textureLerp: 0,
          emissiveIntensity: 1,
          colorShift: [1, 1, 1],
          dissolveThreshold: 0
        };
    }
  }

  /**
   * Synchronizes the mutation state with the VPS and internal world state tracker.
   */
  private async syncToPersistentStorage(mutation: MeshMutationState): Promise<void> {
    try {
      // Register with VPS for autonomous handling if the entity is part of a managed zone
      await this.vpsService.registerMutationEvent({
        targetId: mutation.entityId,
        type: 'MESH_TRANSFORMATION',
        payload: mutation.params,
        persistence: 'PERMANENT'
      });

      // Update the global world state store
      await this.worldState.updateEntityComponent(mutation.entityId, 'MeshMutation', mutation);
    } catch (error) {
      this.logger.error(`Failed to sync mutation for ${mutation.entityId}: ${error.message}`);
    }
  }

  /**
   * Broadcasts the mutation via WebSocket to ensure all players see the change.
   */
  private broadcastToFrontend(mutation: MeshMutationState): void {
    this.socketGateway.server.emit('ENTITY_MUTATION_UPDATE', {
      entityId: mutation.entityId,
      params: mutation.params,
      trigger: mutation.trigger,
      duration: 2000 // Transition duration in ms for the frontend lerp
    });
  }

  /**
   * Narrative engine hook to trigger mutations based on AI agent decisions or world events.
   */
  async handleLoreEvent(event: { type: string; targetId: string; severity: number }) {
    let trigger: NarrativeTrigger;

    if (event.type.includes('corruption')) trigger = NarrativeTrigger.CORRUPTION;
    else if (event.type.includes('bless')) trigger = NarrativeTrigger.SANCTIFICATION;
    else if (event.type.includes('growth')) trigger = NarrativeTrigger.GROWTH;
    else return;

    await this.applyNarrativeMutation(event.targetId, trigger, event.severity);
  }
}