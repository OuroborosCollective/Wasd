import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Group, Object3D } from 'three';

/**
 * ECS Base Interfaces to resolve missing module errors
 */
export interface IComponent {
    [key: string]: any;
}

export abstract class Entity {
    public abstract id: string;
    public abstract components: Map<string, IComponent>;
    public abstract getComponent<T extends IComponent>(name: string): T | undefined;
    public abstract addComponent(name: string, component: IComponent): void;
    public abstract removeComponent(name: string): void;
}

export abstract class System {
    public abstract update(entities: Entity[], deltaTime: number): void;
}

/**
 * AdaptiveProfileManager Singleton to resolve missing module errors
 */
export class AdaptiveProfileManager {
    private static instance: AdaptiveProfileManager;
    
    private constructor() {}

    public static getInstance(): AdaptiveProfileManager {
        if (!AdaptiveProfileManager.instance) {
            AdaptiveProfileManager.instance = new AdaptiveProfileManager();
        }
        return AdaptiveProfileManager.instance;
    }

    public async attachToSlot(entity: Entity, slot: string, model: Object3D): Promise<void> {
        // Logic to find the skeleton and attach the model to the correct bone
        // This usually involves finding a SkinnedMesh in the entity's hierarchy
        console.log(`Attaching model to ${slot} for entity ${entity.id}`);
        return Promise.resolve();
    }
}

/**
 * Component and System Implementation
 */
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

            // Check if path changed and we are not currently loading
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

            // Apply shadow settings and preparation
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

    private prepareModel(model: Group | Object3D): void {
        model.traverse((child: Object3D) => {
            if ((child as any).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }
}

export default AdaptiveProfileSystem;