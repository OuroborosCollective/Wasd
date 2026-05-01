import * as BABYLON from "@babylonjs/core";
import { CollaborationManager } from "../network/CollaborationManager";

export interface EditorObjectData {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scaling: { x: number; y: number; z: number };
}

export class WorldEditor {
    private engine: BABYLON.Engine;
    private scene: BABYLON.Scene;
    private canvas: HTMLCanvasElement;
    private collaborationManager: CollaborationManager;
    private ghostMesh: BABYLON.Nullable<BABYLON.AbstractMesh> = null;

    constructor(canvas: HTMLCanvasElement, roomId: string) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(this.canvas, true);
        this.scene = new BABYLON.Scene(this.engine);
        
        // Initialisierung des CollaborationManagers zur Synchronisation
        this.collaborationManager = new CollaborationManager(roomId);

        this.initScene();
        this.setupCollaborationHandlers();
        this.setupInput();

        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        window.addEventListener("resize", () => {
            this.engine.resize();
        });
    }

    private initScene(): void {
        const camera = new BABYLON.ArcRotateCamera("editorCamera", Math.PI / 4, Math.PI / 3, 15, BABYLON.Vector3.Zero(), this.scene);
        camera.attachControl(this.canvas, true);
        
        const light = new BABYLON.HemisphericLight("mainLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        light.intensity = 0.7;

        const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 50, height: 50 }, this.scene);
        const groundMaterial = new BABYLON.StandardMaterial("groundMat", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMaterial;

        this.ghostMesh = BABYLON.MeshBuilder.CreateBox("ghost", { size: 1 }, this.scene);
        this.ghostMesh.isVisible = false;
        this.ghostMesh.isPickable = false;
        const ghostMat = new BABYLON.StandardMaterial("ghostMat", this.scene);
        ghostMat.alpha = 0.5;
        ghostMat.emissiveColor = BABYLON.Color3.Green();
        this.ghostMesh.material = ghostMat;
    }

    private setupCollaborationHandlers(): void {
        // Horcht auf neue Objekte von anderen Clients
        this.collaborationManager.onObjectAdded((data: EditorObjectData) => {
            this.spawnObjectLocally(data);
        });

        // Horcht auf Transformationen von anderen Clients
        this.collaborationManager.onObjectUpdated((data: EditorObjectData) => {
            const mesh = this.scene.getMeshByName(data.id);
            if (mesh) {
                mesh.position.set(data.position.x, data.position.y, data.position.z);
                mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
                mesh.scaling.set(data.scaling.x, data.scaling.y, data.scaling.z);
            }
        });

        // Horcht auf Löschungen
        this.collaborationManager.onObjectRemoved((id: string) => {
            const mesh = this.scene.getMeshByName(id);
            if (mesh) mesh.dispose();
        });
    }

    private setupInput(): void {
        this.scene.onPointerMove = (evt, pickInfo) => {
            if (pickInfo.hit && this.ghostMesh) {
                this.ghostMesh.isVisible = true;
                this.ghostMesh.position.copyFrom(pickInfo.pickedPoint!);
                this.ghostMesh.position.y += 0.5; // Offset für halbe Box-Höhe
            } else if (this.ghostMesh) {
                this.ghostMesh.isVisible = false;
            }
        };

        this.scene.onPointerDown = (evt, pickInfo) => {
            if (evt.button === 0 && pickInfo.hit && pickInfo.pickedMesh?.name === "ground") {
                this.placeObject(pickInfo.pickedPoint!);
            }
        };
    }

    public placeObject(position: BABYLON.Vector3): void {
        const objectId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const objectData: EditorObjectData = {
            id: objectId,
            type: "cube",
            position: { x: position.x, y: position.y + 0.5, z: position.z },
            rotation: { x: 0, y: 0, z: 0 },
            scaling: { x: 1, y: 1, z: 1 }
        };

        // Lokal spawnen
        this.spawnObjectLocally(objectData);

        // In das synchronisierte Netzwerk-State pushen
        this.collaborationManager.broadcastObjectAddition(objectData);
    }

    private spawnObjectLocally(data: EditorObjectData): void {
        if (this.scene.getMeshByName(data.id)) return;

        let mesh: BABYLON.Mesh;
        if (data.type === "cube") {
            mesh = BABYLON.MeshBuilder.CreateBox(data.id, { size: 1 }, this.scene);
        } else {
            mesh = BABYLON.MeshBuilder.CreateSphere(data.id, { diameter: 1 }, this.scene);
        }

        mesh.position.set(data.position.x, data.position.y, data.position.z);
        mesh.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        mesh.scaling.set(data.scaling.x, data.scaling.y, data.scaling.z);

        const material = new BABYLON.StandardMaterial(`${data.id}_mat`, this.scene);
        material.diffuseColor = BABYLON.Color3.Random();
        mesh.material = material;

        // Ermöglicht das Verschieben (Drag & Drop Logik könnte hier erweitert werden)
        mesh.isPickable = true;
    }

    public dispose(): void {
        this.collaborationManager.disconnect();
        this.engine.dispose();
    }
}