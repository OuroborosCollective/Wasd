import * as THREE from 'three';

export interface ECSObjectData {
    id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w?: number };
    scale: { x: number; y: number; z: number };
    visible?: boolean;
    metadata?: Record<string, any>;
}

export class ThreeAdapter {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private entities: Map<string, THREE.Object3D>;

    constructor(canvas: HTMLCanvasElement, options: THREE.WebGLRendererParameters = {}) {
        this.scene = new THREE.Scene();
        
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            ...options
        });
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.entities = new Map();

        this.setupDefaultLighting();
    }

    private setupDefaultLighting(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);
    }

    public sync(ecsEntities: ECSObjectData[]): void {
        const currentIds = new Set(ecsEntities.map(e => e.id));

        // Remove entities no longer in ECS
        for (const [id, object] of this.entities.entries()) {
            if (!currentIds.has(id)) {
                this.scene.remove(object);
                this.entities.delete(id);
            }
        }

        // Update or Create entities
        for (const data of ecsEntities) {
            let object = this.entities.get(data.id);

            if (!object) {
                object = this.createDefaultPlaceholder(data);
                this.entities.set(data.id, object);
                this.scene.add(object);
            }

            this.updateTransform(object, data);
        }
    }

    private createDefaultPlaceholder(data: ECSObjectData): THREE.Object3D {
        // Default to a Sprite for UI/Overlay or a simple Mesh
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `entity_${data.id}`;
        return mesh;
    }

    private updateTransform(object: THREE.Object3D, data: ECSObjectData): void {
        object.position.set(data.position.x, data.position.y, data.position.z);
        
        if (data.rotation.w !== undefined) {
            object.quaternion.set(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w);
        } else {
            object.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }

        object.scale.set(data.scale.x, data.scale.y, data.scale.z);
        
        if (data.visible !== undefined) {
            object.visible = data.visible;
        }
    }

    public resize(width: number, height: number): void {
        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
        this.renderer.setSize(width, height, false);
    }

    public render(): void {
        this.renderer.render(this.scene, this.camera);
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCamera(): THREE.Camera {
        return this.camera;
    }

    public dispose(): void {
        this.entities.forEach(obj => {
            this.scene.remove(obj);
        });
        this.entities.clear();
        this.renderer.dispose();
    }
}