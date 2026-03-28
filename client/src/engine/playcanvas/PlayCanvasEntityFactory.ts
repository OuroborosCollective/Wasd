import * as pc from 'playcanvas';
import { EntityViewModel } from '../bridge/EntityViewModel';
import { PlayCanvasAssetLoader } from './PlayCanvasAssetLoader';
import { AssetRegistry } from './AssetRegistry';

export class PlayCanvasEntityFactory {
  private loader: PlayCanvasAssetLoader;

  private fontAsset: pc.Asset | null = null;

  constructor(private app: pc.Application) {
    this.loader = new PlayCanvasAssetLoader(app);

    // Load default font
    const fontUrl = 'https://raw.githubusercontent.com/playcanvas/playcanvas.github.io/master/assets/fonts/arial.json';
    this.loader.loadFont(fontUrl).then(asset => {
      this.fontAsset = asset;
      console.log("Default font loaded for nameplates");
    }).catch(err => {
      console.warn("Failed to load default font", err);
    });
  }

  createEntity(model: EntityViewModel): pc.Entity {
    const entity = new pc.Entity(model.id);
    entity.setPosition(model.position.x, model.position.y, model.position.z);
    entity.setEulerAngles(model.rotation.x, model.rotation.y, model.rotation.z);

    // Default representation
    if (model.type === 'player') {
      // Use placeholder while loading
      entity.addComponent('render', { type: 'capsule' });

      // Load real model
      const modelUrl = AssetRegistry['Npc_warrior'] || '/world-assets/characters/Npc_warrior.glb';
      this.loader.loadModel(modelUrl).then(asset => {
        if (entity.render) entity.removeComponent('render');
        entity.addComponent('model', {
          type: 'asset',
          asset: asset.resource.model
        });

        // Add animation component
        if (asset.resource.animations && asset.resource.animations.length > 0) {
          entity.addComponent('animation', {
            assets: asset.resource.animations,
            speed: 1
          });
        }

        entity.setLocalScale(0.01, 0.01, 0.01); // Adjust scale for the warrior model

        // Green nameplate for players
        this.addNameplate(entity, model.name || 'Player', '#44ff44');
      }).catch(err => {
        console.warn("Failed to load warrior model, keeping capsule", err);
      });
    } else if (model.type === 'monster') {
      // Use placeholder
      entity.addComponent('render', { type: 'box' });

      // Load horse model
      const modelUrl = AssetRegistry['boar01'] || '/world-assets/monsters/boar01.glb';
      this.loader.loadModel(modelUrl).then(asset => {
        if (entity.render) entity.removeComponent('render');
        entity.addComponent('model', {
          type: 'asset',
          asset: asset.resource.model
        });
        entity.setLocalScale(0.01, 0.01, 0.01);

        // Red nameplate for monsters
        this.addNameplate(entity, model.name || 'Monster', '#ff4444');
      }).catch(err => {
        console.warn("Failed to load horse model", err);
      });
    } else if (model.type === 'npc') {
      // Use placeholder
      entity.addComponent('render', { type: 'cylinder' });

      // Load horse model for NPC too
      const modelUrl = AssetRegistry['Questnpc_uschi'] || '/world-assets/characters/Questnpc_uschi.glb';
      this.loader.loadModel(modelUrl).then(asset => {
        if (entity.render) entity.removeComponent('render');
        entity.addComponent('model', {
          type: 'asset',
          asset: asset.resource.model
        });
        entity.setLocalScale(0.01, 0.01, 0.01);

        // Blue nameplate for NPCs
        this.addNameplate(entity, model.name || 'NPC', '#4444ff');
      }).catch(err => {
        console.warn("Failed to load NPC model", err);
      });
    } else {
      entity.addComponent('render', {
        type: 'box'
      });
    }

    this.app.root.addChild(entity);
    return entity;
  }

  updateEntity(entity: pc.Entity, updates: Partial<EntityViewModel>): void {
    if (updates.position) {
      entity.setPosition(updates.position.x, updates.position.y, updates.position.z);
    }
    if (updates.rotation) {
      entity.setEulerAngles(updates.rotation.x, updates.rotation.y, updates.rotation.z);
    }
    if (updates.visible !== undefined) {
      entity.enabled = updates.visible;
    }
  }

  playAnimation(entity: pc.Entity, animName: string): void {
    if (entity.animation) {
      // Find animation by name (partial match)
      const anim = entity.animation.assets.find((a: any) => a.name.toLowerCase().includes(animName.toLowerCase()));
      if (anim) {
        entity.animation.play(anim.name, 0.2);
      }
    }
  }

  private addNameplate(entity: pc.Entity, name: string, color: string = '#ffffff') {
    const nameplate = new pc.Entity("Nameplate");

    // Add a screen component to the nameplate
    nameplate.addComponent("screen", {
      screenSpace: false,
      referenceResolution: new pc.Vec2(1280, 720)
    });

    const text = new pc.Entity("Text");
    text.addComponent("element", {
      type: "text",
      text: name,
      fontSize: 32,
      color: new pc.Color().fromString(color),
      alignment: new pc.Vec2(0.5, 0.5),
      anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
      pivot: new pc.Vec2(0.5, 0.5),
      fontAsset: this.fontAsset || undefined
    });

    nameplate.addChild(text);
    entity.addChild(nameplate);
    nameplate.setLocalPosition(0, 2.5, 0);
    nameplate.setLocalScale(0.01, 0.01, 0.01);

    // Make it look at camera (billboard)
    this.app.on("update", () => {
      const camera = this.app.root.findByName("MainCamera");
      if (camera && nameplate.enabled) {
        nameplate.lookAt(camera.getPosition());
        nameplate.rotateLocal(0, 180, 0);
      }
    });
  }
}
