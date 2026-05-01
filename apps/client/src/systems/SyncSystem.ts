import * as BABYLON from '@babylonjs/core';

export interface AssetEntry {
    id: string;
    path: string;
    fileName: string;
    version: string;
    format: 'glb' | 'gltf';
}

export interface AssetManifest {
    baseUrl: string;
    assets: AssetEntry[];
    environment: 'development' | 'production' | 'staging';
}

export interface SyncPayload {
    entityId: string;
    assetId?: string;
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
    private updateInterval: number = 50; 
    private lastUpdateTime: number = 0;

    private assetManifest: Map<string, AssetEntry> = new Map();
    private assetBaseUrl: string = '';

    constructor(scene: BABYLON.Scene, orchestrator: INetworkOrchestrator) {
        this.scene = scene;
        this.orchestrator = orchestrator;
        this.initObservers();
    }

    /**
     * Updates the manifest logic for externalized assets (CDN/S3)
     */
    public loadManifest(manifest: AssetManifest): void {
        this.assetBaseUrl = manifest.baseUrl;
        this.assetManifest.clear();
        manifest.assets.forEach(asset => {
            this.assetManifest.set(asset.id, asset);
        });
    }

    /**
     * Resolves an asset ID to a fully qualified URL for external loading
     */
    public resolveAssetUrl(assetId: string): string | null {
        const asset = this.assetManifest.get(assetId);
        if (!asset) return null;
        
        const cleanBase = this.assetBaseUrl.endsWith('/') ? this.assetBaseUrl.slice(0, -1) : this.assetBaseUrl;
        const cleanPath = asset.path.startsWith('/') ? asset.path : `/${asset.path}`;
        const finalPath = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
        
        return `${cleanBase}${finalPath}${asset.fileName}?v=${asset.version}`;
    }

    private initObservers(): void {
        this.scene.onBeforeRenderObservable.add(() => {
            this.processPlayerSync();
        });

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

    public syncWorldEditorChange(mesh: BABYLON.AbstractMesh): void {
        const payload: SyncPayload = {
            entityId: mesh.metadata?.id || mesh.id,
            assetId: mesh.metadata?.assetId, // Reference from manifest
            position: [mesh.position.x, mesh.position.y, mesh.position.z],
            rotation: mesh.rotationQuaternion 
                ? [mesh.rotationQuaternion.x, mesh.rotationQuaternion.y, mesh.rotationQuaternion.z, mesh.rotationQuaternion.w]
                : [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            scaling: [mesh.scaling.x, mesh.scaling.y, mesh.scaling.z],
            metadata: {
                ...mesh.metadata,
                resolvedUrl: mesh.metadata?.assetId ? this.resolveAssetUrl(mesh.metadata.assetId) : undefined
            },
            timestamp: Date.now()
        };

        this.orchestrator.send('world_update', payload);
    }

    private attachEditorListeners(mesh: BABYLON.AbstractMesh): void {
        mesh.onAfterWorldMatrixUpdateObservable.add(() => {
            if (mesh.metadata?.isBeingEdited) {
                this.syncWorldEditorChange(mesh);
            }
        });
    }

    public dispose(): void {
        this.scene.onBeforeRenderObservable.clear();
        this.assetManifest.clear();
    }
}