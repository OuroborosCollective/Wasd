from pathlib import Path

p = Path('apps/client-2d/src/CyberZenIsoApp.tsx')
s = p.read_text()

imp = 'import { makeModularWeaponSprite } from "./modularWeaponAssembler";\n'
anchor = 'import { moveVisualTowards } from "./visualMotion";\n'
if imp not in s:
    if anchor not in s:
        raise SystemExit('import anchor missing')
    s = s.replace(anchor, anchor + imp)

start = s.find('function addWeaponSprite(')
end = s.find('\n\nfunction deterministicIndex(', start)
if start < 0 or end < 0:
    raise SystemExit('target function missing')

replacement = '''function addWeaponSprite(c: Container, assets: LoadedAssets | null | undefined, name: string, weaponVisualId?: string | null) {
  const manifest = assets?.manifest ?? null;
  const weapon = pickWeaponVisual(manifest, { visualId: weaponVisualId, seed: name });
  const entry = weapon?.entry ?? null;
  const modular = makeModularWeaponSprite(manifest, assets?.textures ?? new Map(), {
    visualId: weaponVisualId ?? weapon?.id ?? null,
    seed: name + ":" + (weaponVisualId ?? weapon?.id ?? "auto"),
    weaponClass: entry?.weaponClass ?? entry?.rules?.weaponClass ?? entry?.kind ?? null,
    rarity: entry?.visualRarity ?? entry?.rarity ?? null,
  });

  if (modular) {
    c.addChild(modular);
    return;
  }

  const tex = weaponTextureFor(assets ?? null, entry);
  if (!tex) return;

  const weaponSprite = spriteFromTexture(tex, 42, 42, 0);
  weaponSprite.x = 16;
  weaponSprite.y = -24;
  weaponSprite.rotation = 0.35;
  weaponSprite.alpha = 0.96;
  c.addChild(weaponSprite);
}'''

s = s[:start] + replacement + s[end:]
p.write_text(s)
print('patched')
