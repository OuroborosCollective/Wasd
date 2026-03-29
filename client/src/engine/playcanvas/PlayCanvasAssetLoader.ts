import * as pc from 'playcanvas';

export class PlayCanvasAssetLoader {
  constructor(private app: pc.Application) {
    // Register Draco and Basis handlers
    this.registerHandlers();
  }

  private registerHandlers() {
    // Draco decoder config
    const dracoConfig = {
      jsUrl: 'https://cdn.jsdelivr.net/npm/draco3d@1.5.7/draco_decoder.js',
      wasmUrl: 'https://cdn.jsdelivr.net/npm/draco3d@1.5.7/draco_decoder.wasm'
    };

    // Configure Draco handler if it exists
    if (this.app.loader.getHandler('container')) {
        const containerHandler = this.app.loader.getHandler('container') as any;
        if (containerHandler.setDraco) {
            containerHandler.setDraco(dracoConfig);
        }
    }

    // Basis/KTX2 config
    const basisConfig = {
      glueUrl: 'https://raw.githubusercontent.com/playcanvas/engine/master/examples/assets/lib/basis/basis.wasm.js',
      wasmUrl: 'https://raw.githubusercontent.com/playcanvas/engine/master/examples/assets/lib/basis/basis.wasm.wasm',
      fallbackUrl: 'https://raw.githubusercontent.com/playcanvas/engine/master/examples/assets/lib/basis/basis.js'
    };

    // PlayCanvas has a built-in basis module we can initialize via the global pc object
    // if the module is available. Since we're using ES modules, we use the type-safe way
    // to access global pc if it's there, or just the imported pc.
    const pcAny = pc as any;
    if (pcAny.basisDownload) {
        pcAny.basisDownload(basisConfig.glueUrl, basisConfig.wasmUrl, basisConfig.fallbackUrl, () => {
            console.log("Basis transcoder initialized");
        });
    }
  }

  async loadModel(url: string): Promise<pc.Asset> {
    return new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(url, 'container', (err, asset) => {
        if (err) {
          console.error(`Failed to load asset from ${url}:`, err);
          reject(err);
        } else {
          resolve(asset as pc.Asset);
        }
      });
    });
  }

  async loadTexture(url: string): Promise<pc.Asset> {
    return new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(url, 'texture', (err, asset) => {
        if (err) {
          console.error(`Failed to load texture from ${url}:`, err);
          reject(err);
        } else {
          resolve(asset as pc.Asset);
        }
      });
    });
  }

  async loadFont(url: string): Promise<pc.Asset> {
    return new Promise((resolve, reject) => {
      this.app.assets.loadFromUrl(url, 'font', (err, asset) => {
        if (err) {
          console.error(`Failed to load font from ${url}:`, err);
          reject(err);
        } else {
          resolve(asset as pc.Asset);
        }
      });
    });
  }
}
