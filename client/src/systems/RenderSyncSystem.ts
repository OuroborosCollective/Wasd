import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { FloraComponent } from "../components/FloraComponent";
import { TransformComponent } from "../components/TransformComponent";
import { BioResonance } from "../utils/BioResonance";
import * as THREE from "three";

export class RenderSyncSystem {
    private world: World;
    private renderer: THREE.WebGLRenderer;
    private floraGroup: THREE.Group;
    private instancedMeshMap: Map<string, THREE.InstancedMesh>;
    private phaseBufferMap: Map<string, Float32Array>;

    constructor(world: World, renderer: THREE.WebGLRenderer, floraGroup: THREE.Group) {
        this.world = world;
        this.renderer = renderer;
        this.floraGroup = floraGroup;
        this.instancedMeshMap = new Map();
        this.phaseBufferMap = new Map();
    }

    public update(): void {
        const currentTick = this.world.getClock().getTicks();
        const entities = this.world.getEntityManager().getEntitiesWithComponents(FloraComponent, TransformComponent);
        
        const entitiesByMesh = this.groupEntitiesByMesh(entities);

        entitiesByMesh.forEach((meshEntities, meshId) => {
            const instancedMesh = this.getOrUpdateInstancedMesh(meshId, meshEntities);
            if (!instancedMesh) return;

            const phaseBuffer = this.phaseBufferMap.get(meshId);
            if (!phaseBuffer) return;

            for (let i = 0; i < meshEntities.length; i++) {
                const entity = meshEntities[i];
                const flora = entity.getComponent(FloraComponent);
                const transform = entity.getComponent(TransformComponent);

                // Berechne individuellen PhaseShift basierend auf BioResonance Logik
                const shift = BioResonance.calculateShift(
                    currentTick,
                    flora.resonanceFrequency,
                    flora.seed,
                    transform.position
                );

                phaseBuffer[i] = shift;
                
                // Matrizen-Update falls Instanz-Positionen sich ändern (Optional, falls statisch)
                const matrix = new THREE.Matrix4();
                matrix.compose(transform.position, transform.rotation, transform.scale);
                instancedMesh.setMatrixAt(i, matrix);
            }

            const geometry = instancedMesh.geometry;
            const attr = geometry.getAttribute("aPhaseShift") as THREE.InstancedBufferAttribute;
            
            if (attr) {
                attr.array.set(phaseBuffer);
                attr.needsUpdate = true;
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
        });
    }

    private groupEntitiesByMesh(entities: Entity[]): Map<string, Entity[]> {
        const groups = new Map<string, Entity[]>();
        for (const entity of entities) {
            const flora = entity.getComponent(FloraComponent);
            const list = groups.get(flora.meshAssetId) || [];
            list.push(entity);
            groups.set(flora.meshAssetId, list);
        }
        return groups;
    }

    private getOrUpdateInstancedMesh(meshId: string, entities: Entity[]): THREE.InstancedMesh | null {
        let instancedMesh = this.instancedMeshMap.get(meshId);
        const count = entities.length;

        if (!instancedMesh || instancedMesh.count !== count) {
            if (instancedMesh) {
                this.floraGroup.remove(instancedMesh);
                instancedMesh.dispose();
            }

            const baseMesh = this.world.getAssetManager().getMesh(meshId);
            if (!baseMesh) return null;

            const geometry = baseMesh.geometry.clone();
            const material = baseMesh.material instanceof THREE.Material 
                ? baseMesh.material.clone() 
                : baseMesh.material[0].clone();

            // Injection des phaseShift Attributs in das Material
            material.onBeforeCompile = (shader: THREE.Shader) => {
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

            const phaseArray = new Float32Array(count);
            geometry.setAttribute("aPhaseShift", new THREE.InstancedBufferAttribute(phaseArray, 1));

            instancedMesh = new THREE.InstancedMesh(geometry, material, count);
            instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            this.instancedMeshMap.set(meshId, instancedMesh);
            this.phaseBufferMap.set(meshId, phaseArray);
            this.floraGroup.add(instancedMesh);
        }

        return instancedMesh;
    }
}