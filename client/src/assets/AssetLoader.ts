export class AssetLoader {
  async load(path:string){
    return { path, status:"loaded_placeholder" };
  }
}