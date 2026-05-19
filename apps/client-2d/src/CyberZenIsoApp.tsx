import { useEffect, useRef, useState } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { createClient } from "@wasd/core-network";
import { fallbackEntry, loadAssetManifest, type AssetEntry, type AssetManifest } from "./assetManifest";
import { ArelorianStitchHud } from "./ArelorianStitchHud";

const TILE_W = 96;
const TILE_H = 48;

type Entity = { root: Container; tx: number; tz: number };
type Msg = { from: string; txt: string };
type LoadedAssets = { manifest: AssetManifest | null; textures: Map<string, Texture> };

function iso(x: number, z: number, width: number, height: number) {
  return { x: width / 2 + (x - z) * TILE_W * 0.5, y: height * 0.45 + (x + z) * TILE_H * 0.5 };
}

function diamond(color: number, stroke = 0x17361e) {
  const g = new Graphics();
  g.moveTo(0, -TILE_H / 2);
  g.lineTo(TILE_W / 2, 0);
  g.lineTo(0, TILE_H / 2);
  g.lineTo(-TILE_W / 2, 0);
  g.closePath();
  g.fill(color);
  g.stroke({ width: 2, color: stroke, alpha: 0.72 });
  return g;
}

function textureFor(assets: LoadedAssets | null, entry: AssetEntry | null): Texture | null {
  if (!assets || !entry?.src) return null;
  return assets.textures.get(entry.src) ?? null;
}

function spriteFromTexture(texture: Texture, width: number, height: number, y = 0) {
  const s = new Sprite(texture);
  s.anchor.set(0.5, 1);
  s.width = width;
  s.height = height;
  s.y = y;
  return s;
}

function propTree(assets?: LoadedAssets | null) {
  const c = new Container();
  const entry = fallbackEntry(assets?.manifest ?? null, "props", "tree");
  const tex = textureFor(assets ?? null, entry);
  if (tex) {
    c.addChild(new Graphics().ellipse(0, 18, 30, 10).fill({ color: 0x010804, alpha: 0.42 }));
    c.addChild(spriteFromTexture(tex, 86, 104));
    return c;
  }
  c.addChild(new Graphics().ellipse(0, 14, 24, 8).fill({ color: 0x010804, alpha: 0.5 }));
  c.addChild(new Graphics().roundRect(-5, -22, 10, 34, 4).fill(0x704323));
  c.addChild(new Graphics().circle(0, -42, 25).fill(0x14572f));
  c.addChild(new Graphics().circle(-9, -32, 18).fill(0x34a35e).stroke({ width: 1, color: 0xa7ffbf, alpha: 0.22 }));
  return c;
}

function propHouse(assets?: LoadedAssets | null) {
  const c = new Container();
  const entry = fallbackEntry(assets?.manifest ?? null, "buildings", "house");
  const tex = textureFor(assets ?? null, entry);
  if (tex) {
    c.addChild(new Graphics().ellipse(0, 20, 52, 14).fill({ color: 0x010804, alpha: 0.44 }));
    c.addChild(spriteFromTexture(tex, 118, 118));
    return c;
  }
  c.addChild(new Graphics().ellipse(0, 18, 48, 12).fill({ color: 0x010804, alpha: 0.44 }));
  c.addChild(new Graphics().roundRect(-34, -36, 68, 48, 8).fill(0x7d5534).stroke({ width: 2, color: 0xffd890, alpha: 0.32 }));
  const roof = new Graphics();
  roof.moveTo(-44, -34); roof.lineTo(0, -70); roof.lineTo(44, -34); roof.lineTo(30, -18); roof.lineTo(-30, -18); roof.closePath();
  roof.fill(0x8e2c2b); roof.stroke({ width: 2, color: 0xffb568, alpha: 0.5 });
  c.addChild(roof, new Graphics().roundRect(-8, -16, 16, 28, 4).fill(0x21100a));
  return c;
}

function avatar(name: string, player = false, assets?: LoadedAssets | null) {
  const c = new Container();
  const aura = player ? 0x00e5ff : 0x39ff14;
  const entry = fallbackEntry(assets?.manifest ?? null, "characters", player ? "player" : "npc");
  const tex = textureFor(assets ?? null, entry);
  c.addChild(new Graphics().ellipse(0, 18, 23, 8).fill({ color: 0x02040a, alpha: 0.56 }));
  if (tex) c.addChild(spriteFromTexture(tex, 58, 74));
  else {
    c.addChild(new Graphics().ellipse(0, -8, 14, 21).fill(player ? 0x267dff : 0x249a56).stroke({ width: 2, color: aura, alpha: 0.55 }));
    c.addChild(new Graphics().circle(0, -34, 11).fill(player ? 0xffd8a9 : 0xd4ffd7).stroke({ width: 2, color: aura, alpha: 0.82 }));
  }
  const label = new Text({ text: name, style: { fontSize: 11, fill: 0xfff0cf, stroke: { color: 0x02030a, width: 3 }, fontFamily: "monospace" } });
  label.anchor.set(0.5, 1); label.y = -58;
  c.addChild(label);
  return c;
}

function place(node: Container, x: number, z: number, width: number, height: number) {
  const p = iso(x, z, width, height);
  node.x = p.x; node.y = p.y; node.zIndex = p.y;
}

async function load2DAssets(): Promise<LoadedAssets> {
  const manifest = await loadAssetManifest();
  const urls = new Set<string>();
  if (manifest) {
    [manifest.tilesets, manifest.characters, manifest.monsters, manifest.buildings, manifest.props, manifest.fx, manifest.ui, manifest.weapons].forEach((group) => {
      Object.values(group ?? {}).forEach((entry) => { if (entry.src) urls.add(entry.src); });
    });
  }
  const textures = new Map<string, Texture>();
  await Promise.all([...urls].map(async (url) => {
    try { textures.set(url, await Assets.load<Texture>(url)); }
    catch (err) { console.warn("[2DAssets] Failed to load", url, err); }
  }));
  return { manifest, textures };
}

export function CyberZenIsoApp() {
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const assetRef = useRef<LoadedAssets | null>(null);
  const entities = useRef<Map<string, Entity>>(new Map());
  const clientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const keys = useRef(new Set<string>());
  const moveAt = useRef(0);
  const playerName = localStorage.getItem("wasd:2d:name") || "Architect";
  const [connected, setConnected] = useState(false);
  const [assetStatus, setAssetStatus] = useState("ASSETS_LOADING");
  const [weaponCount, setWeaponCount] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([{ from: "Oracle", txt: "Cyberzen 2.5D shell online." }]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase());
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    addEventListener("keydown", down); addEventListener("keyup", up);
    return () => { removeEventListener("keydown", down); removeEventListener("keyup", up); };
  }, []);

  useEffect(() => {
    if (!host.current || appRef.current) return;
    const app = new Application();
    appRef.current = app;
    app.init({ backgroundAlpha: 0, resizeTo: host.current, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2) }).then(async () => {
      host.current!.appendChild(app.canvas);
      const loaded = await load2DAssets();
      assetRef.current = loaded;
      const textureCount = loaded.textures.size;
      const weapons = Object.keys(loaded.manifest?.weapons ?? {}).length;
      setWeaponCount(weapons);
      setAssetStatus(textureCount > 0 ? `ASSETS_${textureCount}_LOADED` : "PROXY_GRAPHICS");
      setMessages(m => [...m.slice(-12), { from: "AssetRig", txt: textureCount > 0 ? `Loaded ${textureCount} textures and ${weapons} weapon visuals.` : "No manifest textures yet. Using proxy graphics." }]);
      const terrain = new Container(); const props = new Container(); const actors = new Container(); actors.sortableChildren = true;
      app.stage.addChild(terrain, props, actors);
      buildScene(app, terrain, props, loaded);
      addActor(app, actors, "self", 0, 0, playerName, true, loaded);
      addActor(app, actors, "elder", 2, 1, "Millbrook Elder", false, loaded);
      startNetwork(app, actors);
      app.ticker.add(() => tick(app, actors));
    });
    return () => { clientRef.current?.disconnect(); app.destroy(true); };
  }, []);

  function buildScene(app: Application, terrain: Container, props: Container, assets?: LoadedAssets | null) {
    const terrainTex = textureFor(assets ?? null, fallbackEntry(assets?.manifest ?? null, "tilesets", "terrain"));
    for (let z = -7; z <= 7; z++) for (let x = -7; x <= 7; x++) {
      const tile = terrainTex ? spriteFromTexture(terrainTex, TILE_W, TILE_H, TILE_H / 2) : diamond((x + z) % 4 === 0 ? 0x3f7f48 : 0x356b40);
      place(tile, x, z, app.screen.width, app.screen.height); terrain.addChild(tile);
    }
    [[-4,-2],[4,-3],[-5,3],[5,2]].forEach(([x,z]) => { const t = propTree(assets); place(t, x, z, app.screen.width, app.screen.height); props.addChild(t); });
    [[-2,2],[2,2],[0,-4]].forEach(([x,z]) => { const h = propHouse(assets); place(h, x, z, app.screen.width, app.screen.height); props.addChild(h); });
  }

  function addActor(app: Application, layer: Container, id: string, x: number, z: number, name: string, player: boolean, assets = assetRef.current) {
    if (entities.current.has(id)) return;
    const root = avatar(name, player, assets); place(root, x, z, app.screen.width, app.screen.height);
    layer.addChild(root); entities.current.set(id, { root, tx: x, tz: z });
  }

  function startNetwork(app: Application, layer: Container) {
    const c = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    clientRef.current = c;
    c.on("connect" as any, () => { setConnected(true); setMessages(m => [...m.slice(-12), { from: "Net", txt: "World stream connected." }]); });
    c.on("disconnect" as any, () => setConnected(false));
    c.on("WORLD_HEARTBEAT", (e: any) => {
      Object.entries(e.payload?.players || {}).forEach(([id, p]: any) => addActor(app, layer, id, Number(p.x || 0), Number(p.z || 0), p.name || "Player", true));
      Object.entries(e.payload?.agents || {}).forEach(([id, a]: any) => addActor(app, layer, id, Number(a.x || 0), Number(a.z || 0), a.name || "NPC", false));
    });
    c.on("PLAYER_MOVED", (e: any) => { const ent = entities.current.get(e.payload?.playerId); if (ent) { ent.tx = Number(e.payload.x || ent.tx); ent.tz = Number(e.payload.z || ent.tz); } });
    c.connect();
  }

  function tick(app: Application, layer: Container) {
    let dx = 0, dz = 0; const k = keys.current;
    if (k.has("w") || k.has("arrowup")) dz += 1; if (k.has("s") || k.has("arrowdown")) dz -= 1; if (k.has("a") || k.has("arrowleft")) dx -= 1; if (k.has("d") || k.has("arrowright")) dx += 1;
    if ((dx || dz) && clientRef.current?.connected && Date.now() - moveAt.current > 140) { moveAt.current = Date.now(); clientRef.current.sendPlayerAction("MOVE", { dx, dz }); }
    entities.current.forEach((ent) => { const p = iso(ent.tx, ent.tz, app.screen.width, app.screen.height); ent.root.x += (p.x - ent.root.x) * 0.18; ent.root.y += (p.y - ent.root.y) * 0.18; ent.root.zIndex = ent.root.y; });
    layer.sortChildren();
  }

  function sendSkill(skillId: string) {
    clientRef.current?.sendPlayerAction("USE_SKILL", { skillId });
    setMessages(m => [...m.slice(-12), { from: "Combat", txt: `Skill queued: ${skillId}` }]);
  }

  function sendChat(text: string) {
    clientRef.current?.sendPlayerAction("chat", { text, channel: "local" });
    setMessages(m => [...m.slice(-12), { from: playerName, txt: text }]);
  }

  function interact() {
    clientRef.current?.sendPlayerAction("interact", { targetId: "elder" });
    setMessages(m => [...m.slice(-12), { from: "System", txt: "Interaction ping sent." }]);
  }

  return (
    <div className="az-shell">
      <div className="az-world-glow" />
      <div ref={host} className="az-pixi" />
      <ArelorianStitchHud
        connected={connected}
        assetStatus={assetStatus}
        weaponCount={weaponCount}
        playerName={playerName}
        messages={messages}
        onSkill={sendSkill}
        onChat={sendChat}
        onInteract={interact}
        onToggleAutoMove={() => setMessages(m => [...m.slice(-12), { from: "Navigator", txt: "Auto-route planner not yet linked." }])}
      />
    </div>
  );
}
