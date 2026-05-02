export class AssetLoader {
  private static assets: Map<string, HTMLImageElement> = new Map();

  /**
   * Resolves a full path from a directory and a filename.
   */
  public static getAssetPath(directory: string, file: string): string {
    const base = directory.endsWith('/') ? directory.slice(0, -1) : directory;
    const fileName = file.startsWith('/') ? file.slice(1) : file;
    return `${base}/${fileName}`;
  }

  /**
   * Formats an asset reference string, often used in regex replacements.
   */
  public static formatAssetReference(match: string, quote: string, suffix: string): string {
    return `${quote}${match}${suffix}${quote}`;
  }

  /**
   * Loads a single image asset.
   */
  public static loadImage(url: string): Promise<HTMLImageElement> {
    if (this.assets.has(url)) {
      return Promise.resolve(this.assets.get(url)!);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.assets.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load image at: ${url}`));
      };
      img.src = url;
    });
  }

  /**
   * Batch loads multiple assets.
   */
  public static async loadManifest(directory: string, files: string[]): Promise<void> {
    const promises = files.map(file => {
      const path = this.getAssetPath(directory, file);
      return this.loadImage(path);
    });
    await Promise.all(promises);
  }

  /**
   * Retrieves a loaded asset.
   */
  public static getAsset(url: string): HTMLImageElement | undefined {
    return this.assets.get(url);
  }
}