import * as pc from 'playcanvas';
import { IEngineBridge } from '../bridge/IEngineBridge';
import { EntityViewModel } from '../bridge/EntityViewModel';
import { PlayCanvasEntityFactory } from './PlayCanvasEntityFactory';
import { PlayCanvasAssetLoader } from './PlayCanvasAssetLoader';
import { PlayCanvasCameraController } from './PlayCanvasCameraController';

export class PlayCanvasAdapter implements IEngineBridge {
  private pcEntities: Map<string, pc.Entity> = new Map();
  private entityFactory: PlayCanvasEntityFactory;
  private assetLoader: PlayCanvasAssetLoader;
  private cameraController: PlayCanvasCameraController | null = null;
  private sounds: Map<string, pc.Asset> = new Map();

  constructor(private app: pc.Application) {
    this.entityFactory = new PlayCanvasEntityFactory(app);
    this.assetLoader = new PlayCanvasAssetLoader(app);

    const camera = app.root.findByName('MainCamera');
    if (camera) {
      this.cameraController = new PlayCanvasCameraController(camera);

      // Add sound component to camera for listener
      if (!camera.sound) {
        camera.addComponent('sound', {
          distanceModel: pc.DISTANCE_LINEAR,
          refDistance: 1,
          maxDistance: 100,
          rollOffFactor: 1
        });
      }
    }

    this.initSounds();
    console.log("PlayCanvas Adapter Initialized with Factory, Loader, CameraController and Sounds");
  }

  private initSounds() {
    const soundUrls = {
      'attack': 'https://raw.githubusercontent.com/playcanvas/playcanvas.github.io/master/assets/audio/impact.mp3',
      'hit': 'https://raw.githubusercontent.com/playcanvas/playcanvas.github.io/master/assets/audio/footstep.mp3', // Using footstep as a placeholder for hit
      'footstep': 'https://raw.githubusercontent.com/playcanvas/playcanvas.github.io/master/assets/audio/footstep.mp3',
      'ambient': 'https://raw.githubusercontent.com/playcanvas/playcanvas.github.io/master/assets/audio/ambient.mp3'
    };

    for (const [name, url] of Object.entries(soundUrls)) {
      this.app.assets.loadFromUrl(url, 'audio', (err, asset) => {
        if (!err && asset) {
          this.sounds.set(name, asset);
          console.log(`Sound loaded: ${name}`);

          // If ambient, play it
          if (name === 'ambient') {
            this.playSound(name, { volume: 0.2, loop: true });
          }
        }
      });
    }
  }

  public playSound(name: string, options?: { volume?: number, loop?: boolean, position?: { x: number, y: number, z: number } }): void {
    const asset = this.sounds.get(name);
    if (!asset) return;

    const camera = this.app.root.findByName('MainCamera');
    if (!camera || !camera.sound) return;

    const slotName = `${name}_${Date.now()}`;
    camera.sound.addSlot(slotName, {
      asset: asset,
      volume: options?.volume ?? 1,
      loop: options?.loop ?? false,
      autoPlay: true
    });

    // Cleanup non-looping slots
    if (!options?.loop) {
      setTimeout(() => {
        if (camera.sound) camera.sound.removeSlot(slotName);
      }, 2000);
    }
  }

  createEntity(model: EntityViewModel): void {
    const entity = this.entityFactory.createEntity(model);
    this.pcEntities.set(model.id, entity);
    console.log(`Entity created: ${model.id}`);
  }

  updateEntity(id: string, updates: Partial<EntityViewModel>): void {
    const entity = this.pcEntities.get(id);
    if (!entity) return;
    this.entityFactory.updateEntity(entity, updates);
  }

  destroyEntity(id: string): void {
    const entity = this.pcEntities.get(id);
    if (entity) {
      entity.destroy();
      this.pcEntities.delete(id);
      console.log(`Entity destroyed: ${id}`);
    }
  }

  private navTarget: pc.Vec3 | null = null;
  private navArrow: pc.Entity | null = null;

  setNavigationTarget(position: { x: number, y: number, z: number } | null): void {
    if (!position) {
      this.navTarget = null;
      if (this.navArrow) this.navArrow.enabled = false;
      return;
    }

    this.navTarget = new pc.Vec3(position.x, position.y, position.z);

    if (!this.navArrow) {
      this.navArrow = new pc.Entity("NavArrow");
      this.navArrow.addComponent("render", { type: "cone" });
      this.navArrow.setLocalScale(0.2, 0.5, 0.2);
      this.navArrow.setLocalEulerAngles(90, 0, 0);

      const mat = new pc.StandardMaterial();
      mat.emissive = new pc.Color(0, 1, 0);
      mat.update();
      this.navArrow.render!.meshInstances[0].material = mat;

      this.app.root.addChild(this.navArrow);
    }

    this.navArrow.enabled = true;
  }

  update(dt: number): void {
    if (this.cameraController) {
      this.cameraController.update(dt);
    }

    // Update nav arrow position and rotation
    if (this.navArrow && this.navTarget) {
      const player = this.app.root.findByName(this.localPlayerId || "");
      if (player) {
        const pPos = player.getPosition();
        this.navArrow.setPosition(pPos.x, pPos.y + 2, pPos.z);
        this.navArrow.lookAt(this.navTarget);
        this.navArrow.rotateLocal(90, 0, 0);
      }
    }
  }

  private localPlayerId: string | null = null;
  setCameraTarget(entityId: string): void {
    this.localPlayerId = entityId;
    const entity = this.pcEntities.get(entityId);
    if (entity && this.cameraController) {
      this.cameraController.setTarget(entity);
    }
  }

  async loadModel(url: string): Promise<any> {
    return this.assetLoader.loadModel(url);
  }

  createChunk(chunk: any): void {
    const chunkEntity = new pc.Entity(`Chunk_${chunk.id}`);

    // Create ground plane
    const ground = new pc.Entity("Ground");
    ground.addComponent("render", { type: "box" });
    ground.setLocalScale(16, 0.1, 16);
    ground.setLocalPosition(chunk.chunkX * 16, -0.05, chunk.chunkY * 16);

    // Add a simple grid material
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.2, 0.25);
    material.update();
    ground.render!.meshInstances[0].material = material;

    chunkEntity.addChild(ground);
    this.app.root.addChild(chunkEntity);
    this.pcEntities.set(chunk.id, chunkEntity);
    console.log(`Chunk created: ${chunk.id} at ${chunk.chunkX}, ${chunk.chunkY}`);
  }

  destroyChunk(id: string): void {
    const chunk = this.pcEntities.get(id);
    if (chunk) {
      chunk.destroy();
      this.pcEntities.delete(id);
      console.log(`Chunk destroyed: ${id}`);
    }
  }

  triggerEntityAction(entityId: string, action: string): void {
    const entity = this.pcEntities.get(entityId);
    if (entity) {
      // Trigger animation or effect
      if (action === 'attack') {
        this.entityFactory.playAnimation(entity, 'slash');
      }
    }
  }

  onInput(callback: (input: any) => void): void {
    // Basic keyboard input mapping
    const keys = ['w', 'a', 's', 'd'];
    this.app.keyboard.on(pc.EVENT_KEYDOWN, (e) => {
      const key = e.key.toLowerCase();
      if (keys.includes(key)) {
        callback({ type: 'keydown', key });
      }
      if (e.key === pc.KEY_SPACE) {
        // Trigger attack via core
        if ((window as any).gameCore) {
          (window as any).gameCore.attack();
        }
      }
      if (e.key === pc.KEY_E) {
        // Trigger interact via core
        if ((window as any).gameCore) {
          (window as any).gameCore.interact();
        }
      }
    });

    // Touch support for mobile
    if (this.app.touch) {
      let touchStartPos: pc.Vec2 | null = null;

      this.app.touch.on(pc.EVENT_TOUCHSTART, (e: pc.TouchEvent) => {
        if (e.touches.length === 1) {
          touchStartPos = new pc.Vec2(e.touches[0].x, e.touches[0].y);
        }
      });

      this.app.touch.on(pc.EVENT_TOUCHMOVE, (e: pc.TouchEvent) => {
        if (touchStartPos && e.touches.length === 1) {
          const dx = e.touches[0].x - touchStartPos.x;
          const dy = e.touches[0].y - touchStartPos.y;

          // Threshold for movement
          const threshold = 30;
          if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
            if (Math.abs(dx) > Math.abs(dy)) {
              callback({ type: 'keydown', key: dx > 0 ? 'd' : 'a' });
            } else {
              callback({ type: 'keydown', key: dy > 0 ? 's' : 'w' });
            }
            // Reset start pos to allow continuous movement detection
            touchStartPos = new pc.Vec2(e.touches[0].x, e.touches[0].y);
          }
        }
      });

      this.app.touch.on(pc.EVENT_TOUCHEND, () => {
        touchStartPos = null;
      });
    }
  }
}
