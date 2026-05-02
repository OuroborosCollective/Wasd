import { System, Entity, IComponent } from '../core/ECS.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AdaptiveProfileManager } from '../managers/AdaptiveProfileManager.js';
import { Group, Object3D } from 'three';

export interface AdaptiveProfileComponent extends IComponent {
    fusionAdaptiveGlbPath: string | null;
    lastLoadedPath: string | null;
    targetSlot: 'RightHand' | 'Tool';
    isLoading: boolean;
}

export class AdaptiveProfileSystem extends System {
    private loader: GLTFLoader;
    private profileManager: AdaptiveProfileManager;

    constructor() {
        super();
        this.loader = new GLTFLoader();
        this.profileManager = AdaptiveProfileManager.getInstance();
    }

    public update(entities: Entity[]): void {
        for (const entity of entities) {
            const profile = entity.getComponent<AdaptiveProfileComponent>('AdaptiveProfile');

            if (!profile || !profile.fusionAdaptiveGlbPath) {
                continue;
            }

            if (profile.fusionAdaptiveGlbPath !== profile.lastLoadedPath && !profile.isLoading) {
                this.processAdaptiveModel(entity, profile);
            }
        }
    }

    private async processAdaptiveModel(entity: Entity, profile: AdaptiveProfileComponent): Promise<void> {
        const path = profile.fusionAdaptiveGlbPath;
        if (!path) return;

        profile.isLoading = true;

        try {
            const gltf = await this.loader.loadAsync(path);
            const model = gltf.scene;

            // Ensure the model is prepared for the skeleton
            this.prepareModel(model);

            const slot = profile.targetSlot || 'RightHand';
            
            // Interaction with the AdaptiveProfileManager to handle attachment to NPC skeleton
            await this.profileManager.attachToSlot(entity, slot, model);

            profile.lastLoadedPath = path;
        } catch (error) {
            console.error(`AdaptiveProfileSystem: Failed to load or attach GLB from ${path}`, error);
        } finally {
            profile.isLoading = false;
        }
    }

    private prepareModel(model: Group): void {
        model.traverse((child: Object3D) => {
            if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}

export default AdaptiveProfileSystem;