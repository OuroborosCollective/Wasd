import { Assets, Container, Texture } from "pixi.js";
import { loadAssetManifest, type AssetManifest } from "./assetManifest";
import { syncWorldItems } from "./worldItemRenderer";

let installed = false;
let itemLayer: Container | null = null;
const visuals = new Map<string, { root: Container }>();
let assetsPromise: Promise<{ manifest: AssetManifest | null; textures: Map<string, Texture>; forestTextures: Map<string, Texture> }> | null = null;

function itemsFromPacket(packet: any): any[] {
  if (Array.isArray(packet?.loot)) return packet.loot;
  if (Array.isArray(packet?.payload?.loot)) return packet.payload.loot;
  return [];
}

async function loadWeaponAssets() {
  if (assetsPromise) return assetsPromise;
  assetsPromise = (async () => {
    const manifest = await loadAssetManifest();
    const textures = new Map<string, Texture>();
    const forestTextures = new Map<string, Texture>();
    for (const entry of Object.values(manifest?.weapons ?? {})) {
      if (!entry?.src || textures.has(entry.src)) continue;
      try {
        textures.set(entry.src, await Assets.load<Texture>(entry.src));
      } catch {
        // Fallback graphics cover missing optional textures.
      }
    }
    return { manifest, textures, forestTextures };
  })();
  return assetsPromise;
}

async function renderPacket(packet: any) {
  if (!itemLayer) return;
  const items = itemsFromPacket(packet);
  const assets = await loadWeaponAssets();
  syncWorldItems({
    width: window.innerWidth,
    height: window.innerHeight,
    layer: itemLayer,
    visuals,
    items,
    assets,
  });
}

export function installWorldItemRuntime(): void {
  if (installed) return;
  installed = true;

  const originalAddChild = Container.prototype.addChild;
  Container.prototype.addChild = function patchedAddChild(this: Container, ...children: any[]) {
    const result = originalAddChild.apply(this, children as any);
    if (!itemLayer && children.length >= 4 && children[2] instanceof Container) {
      itemLayer = children[2];
      itemLayer.sortableChildren = true;
    }
    return result;
  } as typeof Container.prototype.addChild;

  window.addEventListener("wasd:world-packet", ((event: CustomEvent) => {
    void renderPacket(event.detail);
  }) as EventListener);
}
