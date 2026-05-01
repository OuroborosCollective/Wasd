import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export interface AssetMetadata {
  id: string;
  path: string;
  type: 'glb' | 'texture' | 'audio';
  version: string;
}

export interface AssetManifest {
  baseUrl: string;
  assets: AssetMetadata[];
}

export class AssetLoader {
  private static instance: AssetLoader;
  private manager: THREE.LoadingManager;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private cache: Map<string, any> = new Map();
  private loadingPromises: Map<string, Promise<any>> = new Map();

  private constructor() {
    this.manager = new THREE.LoadingManager();
    
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

    this.gltfLoader = new GLTFLoader(this.manager);
    this.gltfLoader.setDRACOLoader(dracoLoader);
    this.textureLoader = new THREE.TextureLoader(this.manager);

    this.manager.onStart = (url, itemsLoaded, itemsTotal) => {
      console.log(`Started loading: ${url}. [${itemsLoaded}/${itemsTotal}]`);
    };

    this.manager.onError = (url) => {
      console.error(`There was an error loading ${url}`);
    };
  }

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  /**
   * Loads all assets defined in a manifest file from a CDN or static path
   */
  public async loadFromManifest(manifestUrl: string): Promise<void> {
    try {
      const response = await fetch(manifestUrl);
      const manifest: AssetManifest = await response.json();
      const base = manifest.baseUrl || '';

      const tasks = manifest.assets.map(asset => {
        const fullUrl = `${base}${asset.path}?v=${asset.version}`;
        return this.loadAsset(asset.id, fullUrl, asset.type);
      });

      await Promise.all(tasks);
    } catch (error) {
      console.error('Failed to load asset manifest:', error);
      throw error;
    }
  }

  /**
   * Load individual asset and cache it
   */
  private async loadAsset(id: string, url: string, type: 'glb' | 'texture' | 'audio'): Promise<any> {
    if (this.cache.has(id)) return this.cache.get(id);
    if (this.loadingPromises.has(id)) return this.loadingPromises.get(id);

    const promise = new Promise((resolve, reject) => {
      switch (type) {
        case 'glb':
          this.gltfLoader.load(url, 
            (gltf) => {
              this.cache.set(id, gltf);
              resolve(gltf);
            },
            undefined,
            (err) => reject(err)
          );
          break;
        case 'texture':
          this.textureLoader.load(url,
            (texture) => {
              this.cache.set(id, texture);
              resolve(texture);
            },
            undefined,
            (err) => reject(err)
          );
          break;
        default:
          reject(new Error(`Unsupported asset type: ${type}`));
      }
    });

    this.loadingPromises.set(id, promise);
    return promise;
  }

  public getGLB(id: string): GLTF {
    const asset = this.cache.get(id);
    if (!asset) throw new Error(`Asset with id ${id} not found in cache.`);
    return asset as GLTF;
  }

  public getTexture(id: string): THREE.Texture {
    const asset = this.cache.get(id);
    if (!asset) throw new Error(`Texture with id ${id} not found in cache.`);
    return asset as THREE.Texture;
  }

  public disposeAsset(id: string): void {
    const asset = this.cache.get(id);
    if (asset) {
      if (asset.scene) {
        asset.scene.traverse((child: any) => {
          if (child.isMesh) {
            child.geometry.dispose();
            if (child.material.isMaterial) {
              this.cleanMaterial(child.material);
            } else if (Array.isArray(child.material)) {
              child.material.forEach((m: THREE.Material) => this.cleanMaterial(m));
            }
          }
        });
      } else if (asset.dispose) {
        asset.dispose();
      }
      this.cache.delete(id);
      this.loadingPromises.delete(id);
    }
  }

  private cleanMaterial(material: any): void {
    material.dispose();
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && typeof value.dispose === 'function' && value instanceof THREE.Texture) {
        value.dispose();
      }
    }
  }
}

export const assetLoader = AssetLoader.getInstance();