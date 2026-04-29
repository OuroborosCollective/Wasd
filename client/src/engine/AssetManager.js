import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ProxyGenerator } from './ProxyGenerator.js';

export class AssetManager {
    constructor() {
        this.cache = new Map();
        this.loader = new GLTFLoader();
        this.loadingQueue = new Set();
        this.eventBus = new EventTarget();
    }

    getModel(assetKey, metadata) {
        if (this.cache.has(assetKey)) {
            return this.cache.get(assetKey).clone();
        }

        const container = new THREE.Group();
        container.name = `asset_container_${assetKey}`;

        const placeholder = ProxyGenerator.generate(metadata.type, metadata);
        container.add(placeholder);

        const swapListener = (event) => {
            if (event.detail.assetKey === assetKey) {
                container.remove(placeholder);
                const actualModel = event.detail.model.clone();
                container.add(actualModel);
                this.eventBus.removeEventListener('assetLoaded', swapListener);
            }
        };

        this.eventBus.addEventListener('assetLoaded', swapListener);

        this._loadAsset(assetKey, metadata.path);

        return container;
    }

    _loadAsset(assetKey, path) {
        if (this.loadingQueue.has(assetKey)) {
            return;
        }

        this.loadingQueue.add(assetKey);

        this.loader.load(
            path,
            (gltf) => {
                const model = gltf.scene;
                this.cache.set(assetKey, model);
                this.loadingQueue.delete(assetKey);
                
                const event = new CustomEvent('assetLoaded', {
                    detail: { assetKey, model }
                });
                this.eventBus.dispatchEvent(event);
            },
            undefined,
            (error) => {
                console.error(`AssetManager: Failed to load ${path}`, error);
                this.loadingQueue.delete(assetKey);
            }
        );
    }

    clearCache() {
        this.cache.clear();
        this.loadingQueue.clear();
    }
}

export default new AssetManager();