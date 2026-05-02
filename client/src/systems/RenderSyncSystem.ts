import * as THREE from "three";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { FloraComponent } from "../components/FloraComponent";
import { TransformComponent } from "../components/TransformComponent";
import { BioResonance } from "../utils/BioResonance";

export class RenderSyncSystem {
    private world: World;
    private renderer: THREE.WebGLRenderer;
    private floraGroup: THREE.Group;
    private instancedMeshMap: Map<string, THREE.InstancedMesh>;
    private phaseBufferMap: Map<string, Float32Array>;
    private tempMatrix: THREE.Matrix4;

    constructor(world: World, renderer: THREE.WebGLRenderer, floraGroup: THREE.Group) {
        this.world = world;
        this.renderer = renderer;
        this.floraGroup = floraGroup;
        this.instancedMeshMap = new Map();
        this.phaseBufferMap = new Map();
        this.tempMatrix = new THREE.Matrix4();
    }

    public update(): void {
        const currentTick = this.world.getClock().getTicks();
        const entities = this.world.getEntityManager().getEntitiesWithComponents(FloraComponent, TransformComponent);
        
        const entitiesByMesh = this.groupEntitiesByMesh(entities);

        for (const [meshId, instancedMesh] of this.instancedMeshMap.entries()) {
            if (!entitiesByMesh.has(meshId)) {
                this.floraGroup.remove(instancedMesh);
                if (instancedMesh.geometry) instancedMesh.geometry.dispose();
                if (instancedMesh.material) {
                    if (Array.isArray(instancedMesh.material)) {
                        instancedMesh.material.forEach(m => m.dispose());
                    } else {
                        instancedMesh.material.dispose();
                    }
                }
                instancedMesh.dispose();
                this.instancedMeshMap.delete(meshId);
                this.phaseBufferMap.delete(meshId);
            }
        }

        entitiesByMesh.forEach((meshEntities, meshId) => {
            const instancedMesh = this.getOrUpdateInstancedMesh(meshId, meshEntities);
            if (!instancedMesh) return;

            const phaseBuffer = this.phaseBufferMap.get(meshId);
            if (!phaseBuffer) return;

            for (let i = 0; i < meshEntities.length; i++) {
                const entity = meshEntities[i];
                const flora = entity.getComponent(FloraComponent);
                const transform = entity.getComponent(TransformComponent);

                if (!flora || !transform) continue;

                const shift = BioResonance.calculateShift(
                    currentTick,
                    flora.resonanceFrequency,
                    flora.seed,
                    transform.position
                );

                phaseBuffer[i] = shift;
                
                this.tempMatrix.compose(transform.position, transform.rotation, transform.scale);
                instancedMesh.setMatrixAt(i, this.tempMatrix);
            }

            const geometry = instancedMesh.geometry;
            const attr = geometry.getAttribute("aPhaseShift") as THREE.InstancedBufferAttribute;
            
            if (attr) {
                attr.array.set(phaseBuffer.subarray(0, meshEntities.length));
                attr.needsUpdate = true;
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.count = meshEntities.length;
        });
    }

    private groupEntitiesByMesh(entities: Entity[]): Map<string, Entity[]> {
        const groups = new Map<string, Entity[]>();
        for (const entity of entities) {
            const flora = entity.getComponent(FloraComponent);
            if (flora) {
                const list = groups.get(flora.meshAssetId) || [];
                list.push(entity);
                groups.set(flora.meshAssetId, list);
            }
        }
        return groups;
    }

    private getOrUpdateInstancedMesh(meshId: string, entities: Entity[]): THREE.InstancedMesh | null {
        let instancedMesh = this.instancedMeshMap.get(meshId);
        const count = entities.length;

        if (!instancedMesh || instancedMesh.instanceMatrix.count < count) {
            if (instancedMesh) {
                this.floraGroup.remove(instancedMesh);
                instancedMesh.dispose();
            }

            const assetManager = this.world.getAssetManager();
            const baseMesh = assetManager.getMesh(meshId) as THREE.Mesh;
            if (!baseMesh) return null;

            const geometry = baseMesh.geometry.clone();
            const originalMaterial = (Array.isArray(baseMesh.material) ? baseMesh.material[0] : baseMesh.material) as THREE.MeshStandardMaterial;
            const material = originalMaterial.clone();

            material.onBeforeCompile = (shader: { vertexShader: string; fragmentShader: string; uniforms: { [uniform: string]: any } }) => {
                shader.vertexShader = `
                    attribute float aPhaseShift;
                    varying float vPhase;
                    ${shader.vertexShader}
                `.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>\nvPhase = aPhaseShift;`
                );

                shader.fragmentShader = `
                    varying float vPhase;
                    ${shader.fragmentShader}
                `.replace(
                    `#include <color_fragment>`,
                    `#include <color_fragment>\ndiffuseColor.rgb *= (0.8 + 0.2 * sin(vPhase));`
                );
            };

            const bufferSize = Math.max(count, 32); 
            const phaseArray = new Float32Array(bufferSize);
            geometry.setAttribute("aPhaseShift", new THREE.InstancedBufferAttribute(phaseArray, 1));

            instancedMesh = new THREE.InstancedMesh(geometry, material, bufferSize);
            instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;
            instancedMesh.frustumCulled = false;
            
            this.instancedMeshMap.set(meshId, instancedMesh);
            this.phaseBufferMap.set(meshId, phaseArray);
            this.floraGroup.add(instancedMesh);
        }

        return instancedMesh;
    }
}