import * as BABYLON from '@babylonjs/core';

export interface SyncPayload {
    entityId: string;
    position: number[];
    rotation: number[];
    scaling?: number[];
    metadata?: any;
    timestamp: number;
}

export interface INetworkOrchestrator {
    send(topic: string, data: any): void;
}

export class SyncSystem {
    private scene: BABYLON.Scene;
    private orchestrator: INetworkOrchestrator;
    private playerMesh: BABYLON.AbstractMesh | null = null;
    
    private lastPlayerPos: BABYLON.Vector3 = new BABYLON.Vector3(0, 0, 0);
    private lastPlayerRot: BABYLON.Quaternion = new BABYLON.Quaternion();
    
    private syncThreshold: number = 0.001;
    private updateInterval: number = 50; // ms
    private lastUpdateTime: number = 0;

    constructor(scene: BABYLON.Scene, orchestrator: INetworkOrchestrator) {
        this.scene = scene;
        this.orchestrator = orchestrator;
        this.initObservers();
    }

    private initObservers(): void {
        this.scene.onBeforeRenderObservable.add(() => {
            this.processPlayerSync();
        });

        // Observer for World Editor changes (Gizmo interactions)
        this.scene.onMeshImportedObservable.add((mesh) => {
            this.attachEditorListeners(mesh);
        });
    }

    public setLocalPlayer(mesh: BABYLON.AbstractMesh): void {
        this.playerMesh = mesh;
        this.lastPlayerPos.copyFrom(mesh.position);
        if (mesh.rotationQuaternion) {
            this.lastPlayerRot.copyFrom(mesh.rotationQuaternion);
        }
    }

    private processPlayerSync(): void {
        if (!this.playerMesh) return;

        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) return;

        const currentPos = this.playerMesh.position;
        const currentRot = this.playerMesh.rotationQuaternion || BABYLON.Quaternion.FromEulerVector(this.playerMesh.rotation);

        const posChanged = BABYLON.Vector3.Distance(currentPos, this.lastPlayerPos) > this.syncThreshold;
        const rotChanged = !currentRot.equalsWithEpsilon(this.lastPlayerRot, this.syncThreshold);

        if (posChanged || rotChanged) {
            this.orchestrator.send('player_move', {
                position: [currentPos.x, currentPos.y, currentPos.z],
                rotation: [currentRot.x, currentRot.y, currentRot.z, currentRot.w],
                timestamp: now
            });

            this.lastPlayerPos.copyFrom(currentPos);
            this.lastPlayerRot.copyFrom(currentRot);
            this.lastUpdateTime = now;
        }
    }

    /**
     * Call this from WorldEditor when a mesh transformation is finalized
     */
    public syncWorldEditorChange(mesh: BABYLON.AbstractMesh): void {
        const payload: SyncPayload = {
            entityId: mesh.metadata?.id || mesh.id,
            position: [mesh.position.x, mesh.position.y, mesh.position.z],
            rotation: mesh.rotationQuaternion 
                ? [mesh.rotationQuaternion.x, mesh.rotationQuaternion.y, mesh.rotationQuaternion.z, mesh.rotationQuaternion.w]
                : [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            scaling: [mesh.scaling.x, mesh.scaling.y, mesh.scaling.z],
            metadata: mesh.metadata,
            timestamp: Date.now()
        };

        this.orchestrator.send('world_update', payload);
    }

    private attachEditorListeners(mesh: BABYLON.AbstractMesh): void {
        // Specifically for Gizmo Manager interactions in the Editor
        mesh.onAfterWorldMatrixUpdateObservable.add(() => {
            if (mesh.metadata?.isBeingEdited) {
                this.syncWorldEditorChange(mesh);
            }
        });
    }

    public dispose(): void {
        this.scene.onBeforeRenderObservable.clear();
    }
}