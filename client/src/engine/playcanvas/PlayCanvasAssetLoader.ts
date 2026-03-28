import * as pc from 'playcanvas';

export class PlayCanvasAssetLoader {
  constructor(private app: pc.Application) {}

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
