import { useEffect, useMemo, useState } from "react";

export interface StitchAssetEntry {
  id: string;
  hash?: string;
  kind?: string;
  category?: string;
  culture?: string;
  ext?: string;
  sourcePath?: string;
  sizeBytes?: number;
  src?: string;
  originalSrc?: string;
  cropped?: boolean;
  tags?: string[];
  analysis?: { width?: number | null; height?: number | null; readabilityScore?: number | null; warnings?: string[] } | null;
}

export interface StitchAssetManifest {
  version?: number;
  generatedAt?: string;
  mode?: string;
  inputDir?: string;
  outputDir?: string;
  sharpEnabled?: boolean;
  cropEnabled?: boolean;
  categories?: Record<string, { count: number; assets: string[] }>;
  assets: StitchAssetEntry[];
  stats?: { totalFiles?: number; importedFiles?: number; skippedFiles?: number; croppedImages?: number; warnings?: number };
}

type SemanticBucket = "ui" | "weapons" | "armor" | "items" | "pets" | "characters" | "effects" | "buildings" | "roads" | "dungeons" | "decoration" | "audio" | "metadata" | "unknown";
type ModuleRole = "core" | "attachment" | "detail_fx" | "single_icon" | "blueprint" | "not_modular";

const BUCKETS: SemanticBucket[] = ["ui", "weapons", "armor", "items", "pets", "characters", "effects", "buildings", "roads", "dungeons", "decoration", "audio", "metadata", "unknown"];

const RULES: Array<[SemanticBucket, RegExp]> = [
  ["pets", /\b(pet|pets|companion|familiar|mount|animal|cat|dog|wolf|fox|bird|dragonling|beast_pet)\b/],
  ["roads", /\b(road|roads|path|paths|way|ways|trail|street|bridge|crossing|pavement|cobble)\b/],
  ["dungeons", /\b(dungeon|dungeons|crypt|cave|cavern|lair|raid|boss_room|catacomb|underworld)\b/],
  ["weapons", /\b(sword|axe|bow|staff|shield|weapon|dagger|mace|spear|katana|blade|wand|hilt|pommel)\b/],
  ["armor", /\b(armor|helmet|boots|gloves|pants|robe|tunic|chainmail|plate|leather|shirt|breastplate|gauntlet)\b/],
  ["decoration", /\b(decor|decoration|prop|barrel|crate|chair|table|plant|statue|lamp|banner|rug)\b/],
  ["buildings", /\b(building|house|wall|castle|tower|gate|door|city|village|kingdom|fort|crest)\b/],
  ["characters", /\b(character|hero|player|npc|villager|guard|warrior|mage|rogue|samurai|knight|archer|enemy|monster|boss|person|people)\b/],
  ["effects", /\b(effect|fx|particle|spell|magic|slash|impact|fire|ice|lightning|explosion|aura|hit|spark|smoke|resistance)\b/],
  ["ui", /\b(ui|icon|symbol|button|hud|panel|frame|cursor|menu|slot|inventory|paperdoll|loot|dashboard|interface)\b/],
  ["audio", /\b(audio|music|sound|sfx|ambient|footstep|attack)\b/],
  ["metadata", /\b(json|atlas|xml|meta|metadata)\b/],
  ["items", /\b(item|loot|coin|gem|potion|scroll|resource|ore|wood|fish|food|material)\b/],
];

function assetHay(asset: StitchAssetEntry): string {
  return [asset.id, asset.category, asset.kind, asset.culture, asset.sourcePath, ...(asset.tags ?? [])].filter(Boolean).join(" ").toLowerCase();
}

function isAffixSymbol(asset: StitchAssetEntry): boolean {
  const hay = assetHay(asset);
  return /\b(affix|crit|mana|strength|agility|cooldown|abklingzeit|resistance_icon|fire_resistance|ice_resistance|lightning_resistance)\b/.test(hay);
}

function detectBucket(asset: StitchAssetEntry): SemanticBucket {
  const hay = assetHay(asset);
  if (isAffixSymbol(asset)) return "ui";
  for (const [bucket, rule] of RULES) if (rule.test(hay)) return bucket;
  if (asset.category === "equipment") return "items";
  if (asset.category === "character") return "characters";
  if (asset.category === "building") return "buildings";
  if (asset.category === "effect") return "effects";
  if (asset.category === "ui") return "ui";
  if (asset.kind === "metadata") return "metadata";
  if (asset.kind === "audio") return "audio";
  return "unknown";
}

function displayName(asset: StitchAssetEntry): string {
  const fromPath = asset.sourcePath?.split("/").filter(Boolean).at(-2);
  return (fromPath || asset.id || "asset").replace(/^a_|^an_/i, "").replace(/[_\.]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function isPreviewableImage(asset: StitchAssetEntry): boolean {
  return asset.kind === "image" && Boolean(asset.src);
}

function usageRole(bucket: SemanticBucket, asset: StitchAssetEntry): string {
  if (isAffixSymbol(asset)) return "single_affix_symbol";
  if (bucket === "weapons") return "modular_equipment:weapon";
  if (bucket === "armor") return "modular_equipment:armor";
  if (bucket === "items") return "modular_inventory_asset";
  if (bucket === "pets") return "modular_pet_or_companion";
  if (bucket === "characters") return "modular_entity_person_npc";
  if (bucket === "effects") return "modular_fx_layer";
  if (bucket === "buildings") return "modular_world_structure";
  if (bucket === "roads") return "modular_world_path";
  if (bucket === "dungeons") return "modular_dungeon_piece";
  if (bucket === "decoration") return "modular_world_prop";
  if (bucket === "metadata") return "metadata_companion";
  if (bucket === "audio") return "audio_asset";
  if (bucket === "ui" && asset.kind === "binary") return "ui_blueprint";
  if (bucket === "ui") return "hud_or_icon";
  return "review_required";
}

function moduleRole(bucket: SemanticBucket, asset: StitchAssetEntry): ModuleRole {
  if (isAffixSymbol(asset)) return "single_icon";
  if (bucket === "ui" && asset.kind === "binary") return "blueprint";
  if (["audio", "metadata", "unknown"].includes(bucket)) return "not_modular";
  const hay = assetHay(asset);
  if (/\b(base|body|core|torso|blade|foundation|tile|floor|road|path|skeleton|frame|main|root)\b/.test(hay)) return "core";
  if (/\b(handle|hilt|grip|pommel|head|helmet|limb|leg|arm|wall|door|gate|tower|attachment|part|section|plate|component)\b/.test(hay)) return "attachment";
  if (/\b(vfx|fx|aura|crest|rank|trim|detail|rune|gem|socket|overlay|emblem|gauntlet|magic|glow)\b/.test(hay)) return "detail_fx";
  return "core";
}

function moduleContract(bucket: SemanticBucket, asset: StitchAssetEntry): string {
  if (isAffixSymbol(asset)) return "single affix symbol";
  if (bucket === "ui" && asset.kind === "binary") return "ui blueprint / preview only";
  if (["audio", "metadata", "unknown"].includes(bucket)) return "single asset / review";
  return "3-module contract: core + attachment + detail/fx";
}

export function StitchAssetGalleryPanel() {
  const [manifest, setManifest] = useState<StitchAssetManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<SemanticBucket | "all">("all");
  const [showBlueprints, setShowBlueprints] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setError(null);
        const response = await fetch("/2d-assets/game-assets/manifest.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`Manifest not available yet: HTTP ${response.status}`);
        const parsed = (await response.json()) as StitchAssetManifest;
        if (!Array.isArray(parsed.assets)) throw new Error("Invalid Stitch manifest: assets[] missing");
        if (!cancelled) setManifest(parsed);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const enriched = useMemo(() => {
    return (manifest?.assets ?? []).map((asset) => {
      const bucket = detectBucket(asset);
      return { asset, bucket, name: displayName(asset), role: moduleRole(bucket, asset) };
    }).sort((a, b) => a.bucket.localeCompare(b.bucket) || Number(isPreviewableImage(b.asset)) - Number(isPreviewableImage(a.asset)) || a.name.localeCompare(b.name));
  }, [manifest]);

  const counts = useMemo(() => {
    const out = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0])) as Record<SemanticBucket, number>;
    for (const item of enriched) out[item.bucket] += 1;
    return out;
  }, [enriched]);

  const moduleCounts = useMemo(() => {
    return enriched.reduce((acc, item) => {
      if (item.role === "core" || item.role === "attachment" || item.role === "detail_fx" || item.role === "single_icon") acc[item.role] += 1;
      return acc;
    }, { core: 0, attachment: 0, detail_fx: 0, single_icon: 0 } as Record<"core" | "attachment" | "detail_fx" | "single_icon", number>);
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter(({ asset, bucket, name, role }) => {
      if (selectedBucket !== "all" && bucket !== selectedBucket) return false;
      if (!showBlueprints && asset.kind === "binary") return false;
      if (!q) return true;
      return [asset.id, asset.sourcePath, asset.category, asset.kind, bucket, role, name].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [enriched, query, selectedBucket, showBlueprints]);

  return (
    <section className="stitch-gallery-panel" data-testid="stitch-asset-gallery-panel">
      <header className="stitch-gallery-header">
        <div>
          <p className="stitch-gallery-kicker">STITCH ASSET GALLERY</p>
          <h2>Imported Loot UI Pack</h2>
          <p>Everything modular except affix symbols: NPCs/persons, pets, weapons, armor, buildings, roads and dungeons use a 3-module contract.</p>
        </div>
        <div className="stitch-gallery-stats"><strong>{manifest?.assets.length ?? 0}</strong><span>assets</span><strong>{manifest?.stats?.croppedImages ?? 0}</strong><span>cropped</span><strong>{manifest?.stats?.warnings ?? 0}</strong><span>warnings</span></div>
      </header>

      {error && <div className="stitch-gallery-empty" data-testid="stitch-asset-gallery-missing"><strong>Manifest noch nicht verfügbar.</strong><p>{error}</p><p>Merge zuerst den Stitch-Import-PR, dann deploy/build. Danach zeigt dieses Panel die Assets automatisch.</p></div>}

      {!error && manifest && <>
        <div className="stitch-gallery-module-summary"><article><strong>{moduleCounts.core}</strong><span>module cores</span></article><article><strong>{moduleCounts.attachment}</strong><span>attachments</span></article><article><strong>{moduleCounts.detail_fx}</strong><span>details / fx</span></article><article><strong>{moduleCounts.single_icon}</strong><span>single affix icons</span></article></div>
        <div className="stitch-gallery-toolbar"><button className={selectedBucket === "all" ? "active" : ""} onClick={() => setSelectedBucket("all")}>all <span>{enriched.length}</span></button>{BUCKETS.map((bucket) => <button key={bucket} className={selectedBucket === bucket ? "active" : ""} onClick={() => setSelectedBucket(bucket)}>{bucket} <span>{counts[bucket]}</span></button>)}</div>
        <div className="stitch-gallery-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pets, roads, dungeons, modules, affix, id, path..." aria-label="Search Stitch assets" /><label><input type="checkbox" checked={showBlueprints} onChange={(event) => setShowBlueprints(event.target.checked)} /> show HTML UI blueprints</label></div>
        <div className="stitch-gallery-grid" data-testid="stitch-asset-gallery-grid">{filtered.map(({ asset, bucket, name, role }) => <article className="stitch-gallery-card" key={asset.id} data-bucket={bucket}><div className="stitch-gallery-preview">{isPreviewableImage(asset) ? <img src={asset.src} alt={name} loading="lazy" /> : <div className="stitch-gallery-blueprint"><span>{asset.kind === "binary" ? "HTML" : asset.kind ?? "asset"}</span><small>{asset.ext || "blueprint"}</small></div>}</div><div className="stitch-gallery-card-body"><h3 title={asset.id}>{name}</h3><div className="stitch-gallery-tags"><span>{bucket}</span><span>{asset.category ?? "unknown"}</span><span>{asset.kind ?? "unknown"}</span><span>{usageRole(bucket, asset)}</span><span>{moduleContract(bucket, asset)}</span>{role !== "not_modular" && <span>module:{role}</span>}{asset.cropped && <span>cropped</span>}</div><p title={asset.sourcePath}>{asset.sourcePath}</p><code>{asset.id}</code></div></article>)}</div>
      </>}
    </section>
  );
}
