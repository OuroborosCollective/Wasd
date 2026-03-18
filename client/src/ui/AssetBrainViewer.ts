import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetBrainViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private loader: GLTFLoader;
  private container: HTMLElement;
  private currentModel: THREE.Group | null = null;
  private animationId: number | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private animations: THREE.AnimationClip[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(5, 5, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.loader = new GLTFLoader();

    this.initLights();
    this.initHelpers();
    this.animate();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemisphereLight);
  }

  private initHelpers() {
    const gridHelper = new THREE.GridHelper(10, 10, 0x4a7c9e, 0x2a4a5e);
    this.scene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    this.scene.add(axesHelper);
  }

  public async loadModel(url: string): Promise<void> {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          this.currentModel = gltf.scene;
          this.scene.add(this.currentModel);

          this.animations = gltf.animations;
          if (this.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.currentModel);
            // Play the first animation by default
            const action = this.mixer.clipAction(this.animations[0]);
            action.play();
          }

          // Center and scale model
          const box = new THREE.Box3().setFromObject(this.currentModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          
          this.currentModel.scale.setScalar(scale);
          this.currentModel.position.sub(center.multiplyScalar(scale));
          this.currentModel.position.y = 0; // Place on grid

          resolve();
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
          reject(error);
        }
      );
    });
  }

  public setWireframe(enabled: boolean) {
    if (!this.currentModel) return;
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.wireframe = enabled);
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  public toggleNormals(enabled: boolean) {
    if (!this.currentModel) return;
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const existing = this.scene.getObjectByName('normalsHelper_' + child.uuid);
        if (existing) this.scene.remove(existing);
        if (enabled) {
          const helper = new THREE.VertexNormalsHelper(child, 0.1, 0x00ff00);
          helper.name = 'normalsHelper_' + child.uuid;
          this.scene.add(helper);
        }
      }
    });
  }

  public setLightingMode(mode: 'default' | 'flat') {
    if (!this.currentModel) return;
    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial) {
            (mat as any).flatShading = mode === 'flat';
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  public getModelStats(): { vertices: number; triangles: number; materials: number; meshes: number } {
    let vertices = 0;
    let triangles = 0;
    let materials = new Set<THREE.Material>();
    let meshes = 0;

    if (!this.currentModel) return { vertices: 0, triangles: 0, materials: 0, meshes: 0 };

    this.currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes++;
        if (child.geometry) {
          const pos = child.geometry.getAttribute('position');
          if (pos) vertices += pos.count;
          if (child.geometry.index) {
            triangles += child.geometry.index.count / 3;
          } else {
            triangles += pos.count / 3;
          }
        }
        if (Array.isArray(child.material)) {
          child.material.forEach(m => materials.add(m));
        } else {
          materials.add(child.material);
        }
      }
    });

    return { vertices, triangles, materials: materials.size, meshes };
  }

  public resetView() {
    if (!this.currentModel) return;
    const box = new THREE.Box3().setFromObject(this.currentModel);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;
    
    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public setBackgroundColor(color: number) {
    this.scene.background = new THREE.Color(color);
  }

  private onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private clock!: THREE.Clock;

  private animate() {
    this.clock = new THREE.Clock();
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    if (this.mixer) this.mixer.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }

  public getAnimationNames(): string[] {
    return this.animations.map(clip => clip.name);
  }

  public playAnimation(name: string) {
    if (!this.mixer || !this.currentModel) return;
    const clip = this.animations.find(a => a.name === name);
    if (clip) {
      this.mixer.stopAllAction();
      const action = this.mixer.clipAction(clip);
      action.play();
    }
  }

  public stopAnimations() {
    this.mixer?.stopAllAction();
  }
}
