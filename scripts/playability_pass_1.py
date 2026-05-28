from pathlib import Path

cyber = Path('apps/client-2d/src/CyberZenIsoApp.tsx')
s = cyber.read_text()

s = s.replace('import { spawnTouchRipple } from "./fxLogic";', 'import { spawnFloatingStatus, spawnTouchRipple } from "./fxLogic";')

s = s.replace(
  '  const actorLayerRef = useRef<Container | null>(null);\n  const assetRef = useRef<LoadedAssets | null>(null);',
  '  const worldLayerRef = useRef<Container | null>(null);\n  const actorLayerRef = useRef<Container | null>(null);\n  const fxLayerRef = useRef<Container | null>(null);\n  const assetRef = useRef<LoadedAssets | null>(null);'
)

s = s.replace(
  '      const terrain = new Container();\n      const props = new Container();\n      const actors = new Container();\n      const fx = new Container();',
  '      const world = new Container();\n      const terrain = new Container();\n      const props = new Container();\n      const actors = new Container();\n      const fx = new Container();'
)

s = s.replace(
  '      terrain.sortableChildren = true;\n      terrain.zIndex = TERRAIN_Z_INDEX;',
  '      world.sortableChildren = true;\n      worldLayerRef.current = world;\n      terrain.sortableChildren = true;\n      terrain.zIndex = TERRAIN_Z_INDEX;'
)

s = s.replace(
  '      actorLayerRef.current = actors;\n      app.stage.sortableChildren = true;',
  '      actorLayerRef.current = actors;\n      fxLayerRef.current = fx;\n      app.stage.sortableChildren = true;'
)

s = s.replace(
  '      app.stage.addChild(terrain, props, actors, fx);\n      app.stage.on("pointertap", (event) => spawnTouchRipple(fx, { x: event.global.x, y: event.global.y }));',
  '      world.addChild(terrain, props, actors, fx);\n      app.stage.addChild(world);\n      app.stage.on("pointertap", (event) => {\n        const point = fx.toLocal(event.global);\n        spawnTouchRipple(fx, { x: point.x, y: point.y });\n      });'
)

old_tick = '''  function tick(app: Application, layer: Container, deltaTime = 1) {
    let dx = 0, dz = 0;
    const k = keys.current;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (dx || dz) sendMove({ dx, dz });
    entities.current.forEach((ent) => {
      const p = iso(ent.tx, ent.tz, app.screen.width, app.screen.height);
      moveVisualTowards(ent.root, p, deltaTime);
    });
  }

  function sendSkill(skillId: string) {
    clientRef.current?.sendPlayerAction("USE_SKILL", { skillId, weaponVisualId: equippedWeaponId });
    setMessages(m => [...m.slice(-12), { from: "Combat", txt: `Skill queued: ${skillId}` }]);
  }
'''

new_tick = '''  function followCamera(app: Application, deltaTime = 1) {
    const world = worldLayerRef.current;
    const self = entities.current.get("self");
    if (!world || !self) return;
    const targetX = app.screen.width / 2 - self.root.x;
    const targetY = app.screen.height / 2 - self.root.y - 18;
    const ease = Math.min(0.16 * deltaTime, 0.35);
    world.x += (targetX - world.x) * ease;
    world.y += (targetY - world.y) * ease;
  }

  function tick(app: Application, layer: Container, deltaTime = 1) {
    let dx = 0, dz = 0;
    const k = keys.current;
    if (k.has("w") || k.has("arrowup")) dz += 1;
    if (k.has("s") || k.has("arrowdown")) dz -= 1;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (dx || dz) sendMove({ dx, dz });
    const now = performance.now();
    entities.current.forEach((ent) => {
      const p = iso(ent.tx, ent.tz, app.screen.width, app.screen.height);
      moveVisualTowards(ent.root, p, deltaTime);
      if (!ent.isPlayer) {
        const phase = deterministicIndex(ent.name, 31) * 0.27;
        ent.root.y += Math.sin(now / 620 + phase) * 1.2;
        ent.root.rotation = Math.sin(now / 900 + phase) * 0.01;
      }
    });
    followCamera(app, deltaTime);
  }

  function spawnLocalSkillFx(skillId: string) {
    const fx = fxLayerRef.current;
    const self = entities.current.get("self");
    if (!fx || !self) return;
    const label = skillId === "atk" ? "STRIKE" : skillId.toUpperCase();
    spawnTouchRipple(fx, { x: self.root.x + 20, y: self.root.y - 28 });
    spawnFloatingStatus(fx, { x: self.root.x + 24, y: self.root.y - 34, text: label });
  }

  function sendSkill(skillId: string) {
    spawnLocalSkillFx(skillId);
    clientRef.current?.sendPlayerAction("USE_SKILL", { skillId, weaponVisualId: equippedWeaponId });
    setMessages(m => [...m.slice(-12), { from: "Combat", txt: `Skill queued: ${skillId}` }]);
  }
'''

if old_tick not in s:
    raise SystemExit('tick/sendSkill block not found')
s = s.replace(old_tick, new_tick)
cyber.write_text(s)

css = Path('apps/client-2d/src/theme.css')
c = css.read_text()
patch = '''

/* Playability pass 1: prevent mobile HUD overlap and keep combat reachable. */
@media (max-width: 920px) {
  .stitch-side-menu {
    top: 82px;
    right: 10px;
    bottom: auto;
    grid-template-columns: repeat(2, 52px);
  }
  .stitch-skillbar {
    right: 10px;
    bottom: 10px;
    max-height: calc(100vh - 210px);
    overflow: auto;
  }
}

@media (max-width: 520px) {
  .stitch-side-menu {
    top: 168px;
    right: 10px;
    bottom: auto;
    grid-template-columns: repeat(2, 42px);
  }
  .stitch-side-menu button {
    width: 42px;
    min-height: 40px;
  }
  .stitch-skillbar button {
    width: 64px;
    height: 48px;
  }
}
'''
if 'Playability pass 1' not in c:
    css.write_text(c.rstrip() + patch)

html = Path('apps/client-2d/index.html')
h = html.read_text()
start = h.find('    #live-build-badge {')
if start != -1:
    end = h.find('    }', start)
    if end != -1:
        h = h[:start] + h[end + len('    }\n'):]
h = h.replace('  <div id="live-build-badge">LIVE PR1316</div>\n', '')
html.write_text(h)

print('playability pass 1 patch applied')
