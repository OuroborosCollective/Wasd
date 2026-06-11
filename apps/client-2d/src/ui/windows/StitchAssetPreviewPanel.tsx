/**
 * StitchAssetPreviewPanel.tsx
 *
 * Cyber-Zen styled preview panel for Stitch 2.5D atlas assets.
 * Shows accepted runtime assets, review queues and deterministic resonance binding proof.
 *
 * Data-testid attributes for E2E testing:
 *   data-testid="stitch-asset-preview-panel"
 *   data-testid="stitch-asset-enemy-sample"
 *   data-testid="stitch-asset-tile-sample"
 *   data-testid="stitch-asset-vfx-sample"
 *   data-testid="stitch-asset-prop-sample"
 *   data-testid="stitch-asset-building-sample"
 *   data-testid="stitch-asset-manifest-count"
 *   data-testid="stitch-asset-quarantine-count"
 *   data-testid="stitch-asset-manual-review-count"
 *   data-testid="stitch-asset-reference-only-count"
 *   data-testid="stitch-resonance-result"
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStitchManifest,
  getDefaultBuildingSprite,
  getDefaultEnemySprite,
  getDefaultPropSprite,
  getDefaultTileSprite,
  getDefaultVfxSprite,
  getManifestStats,
  getManualReviewEntries,
  getReferenceOnlyEntries,
  stitchImageUrl,
  type StitchRuntimeAsset,
  type StitchRuntimeManifest,
} from "../../game/stitchAssetManifest";
import {
  AutonomousResonanceRouter,
  type MaterializationResult,
  type WorldLogicalState,
} from "../../rendering/AutonomousResonanceRouter";

import "./stitchAssetPreviewPanel.css";

interface StitchAssetCardProps {
  readonly label: string;
  readonly asset: StitchRuntimeAsset | undefined;
  readonly manifest: StitchRuntimeManifest;
  readonly testId: string;
  readonly accentColor: string;
}

interface ResonanceScenario {
  readonly id: string;
  readonly label: string;
  readonly state: WorldLogicalState;
}

const RESONANCE_SCENARIOS: readonly ResonanceScenario[] = Object.freeze([
  {
    id: "enemy-undead",
    label: "UNDEAD ENEMY",
    state: {
      baseType: "enemy",
      season: "neutral",
      decayLevel: "none",
      culture: "undead",
      biome: "dungeon",
    },
  },
  {
    id: "vfx-arelorian",
    label: "ARELORIAN VFX",
    state: {
      baseType: "vfx",
      season: "neutral",
      decayLevel: "none",
      culture: "arelorian",
    },
  },
  {
    id: "building-settlement",
    label: "SETTLEMENT BUILDING",
    state: {
      baseType: "building",
      season: "neutral",
      decayLevel: "none",
      culture: "universal",
      environment: "settlement",
    },
  },
  {
    id: "prop-dungeon",
    label: "GOTHIC PROP",
    state: {
      baseType: "prop",
      season: "neutral",
      decayLevel: "none",
      culture: "gothic",
      biome: "dungeon",
    },
  },
]);

function StitchAssetCard({ label, asset, manifest, testId, accentColor }: StitchAssetCardProps) {
  if (!asset) {
    return (
      <div className="stitch-asset-card stitch-asset-card--empty" data-testid={testId}>
        <div className="stitch-asset-card__label">{label}</div>
        <div className="stitch-asset-card__empty">No {label.toLowerCase()} asset</div>
      </div>
    );
  }

  const imgUrl = stitchImageUrl(manifest, asset);

  return (
    <div className="stitch-asset-card" data-testid={testId}>
      <div className="stitch-asset-card__header">
        <span className="stitch-asset-card__label">{label}</span>
        <span className="stitch-asset-card__badge stitch-asset-card__badge--accepted">accepted</span>
      </div>
      <div className="stitch-asset-card__preview">
        <img
          src={imgUrl}
          alt={asset.displayName}
          className="stitch-asset-card__img"
          loading="lazy"
        />
      </div>
      <div className="stitch-asset-card__meta">
        <span className="stitch-asset-card__id" title={asset.assetId}>{asset.assetId}</span>
        <span className="stitch-asset-card__frames">{asset.frameCount} frames</span>
        <span className="stitch-asset-card__dims">
          {asset.frameWidth}x{asset.frameHeight}
        </span>
      </div>
      <div className="stitch-asset-card__category" style={{ borderColor: accentColor }}>
        {asset.category}
      </div>
    </div>
  );
}

function WorldVectorView({ state }: { readonly state: WorldLogicalState }) {
  const entries = [
    ["base", state.baseType],
    ["season", state.season],
    ["decay", state.decayLevel],
    ["culture", state.culture],
    ["biome", state.biome ?? "-"],
    ["env", state.environment ?? "-"],
  ] as const;

  return (
    <div className="stitch-resonance__vector" data-testid="stitch-resonance-world-vector">
      {entries.map(([key, value]) => (
        <span key={key} className="stitch-resonance__vector-chip">
          <span>{key}</span>
          <strong>{value}</strong>
        </span>
      ))}
    </div>
  );
}

function QueuePreview({
  title,
  entries,
  testId,
}: {
  readonly title: string;
  readonly entries: readonly { readonly assetId: string; readonly category: string; readonly warnings: readonly string[] }[];
  readonly testId: string;
}) {
  const visible = entries.slice(0, 3);

  return (
    <div className="stitch-asset-preview-panel__queue" data-testid={testId}>
      <div className="stitch-asset-preview-panel__queue-title">
        <span>{title}</span>
        <strong>{entries.length}</strong>
      </div>
      {visible.length > 0 ? (
        <div className="stitch-asset-preview-panel__queue-list">
          {visible.map((entry) => (
            <div key={entry.assetId} className="stitch-asset-preview-panel__queue-item">
              <span className="stitch-asset-preview-panel__queue-id" title={entry.assetId}>{entry.assetId}</span>
              <span className="stitch-asset-preview-panel__queue-cat">{entry.category}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="stitch-asset-preview-panel__queue-empty">empty</div>
      )}
    </div>
  );
}

function ResonanceProof({
  manifest,
  scenario,
  result,
}: {
  readonly manifest: StitchRuntimeManifest;
  readonly scenario: ResonanceScenario;
  readonly result: MaterializationResult;
}) {
  const selectedAsset = result.fallback
    ? undefined
    : manifest.assets.find((asset) => asset.assetId === result.assetId);

  return (
    <div className="stitch-resonance" data-testid="stitch-resonance-result">
      <div className="stitch-resonance__header">
        <span className="stitch-resonance__title">RESONANCE PROOF</span>
        <span
          className={`stitch-resonance__badge ${result.fallback ? "stitch-resonance__badge--fallback" : "stitch-resonance__badge--ok"}`}
        >
          {result.fallback ? "fallback" : "bound"}
        </span>
      </div>

      <WorldVectorView state={scenario.state} />

      <div className="stitch-resonance__body">
        <div className="stitch-resonance__preview">
          {selectedAsset ? (
            <img
              src={stitchImageUrl(manifest, selectedAsset)}
              alt={selectedAsset.displayName}
              className="stitch-resonance__img"
              loading="lazy"
            />
          ) : (
            <div className="stitch-resonance__fallback">NO ACCEPTED MATCH</div>
          )}
        </div>
        <div className="stitch-resonance__meta">
          <span className="stitch-resonance__asset" title={result.assetId}>{result.assetId}</span>
          <span data-testid="stitch-resonance-score">score {result.resonanceScore}</span>
          <span>{result.matchedVectors.length > 0 ? result.matchedVectors.join(" + ") : "no matched vectors"}</span>
        </div>
      </div>
    </div>
  );
}

export function StitchAssetPreviewPanel() {
  const [manifest, setManifest] = useState<StitchRuntimeManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(RESONANCE_SCENARIOS[0].id);

  const loadManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextManifest = await fetchStitchManifest();
      setManifest(nextManifest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifest");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  const selectedScenario = useMemo(() => {
    return RESONANCE_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? RESONANCE_SCENARIOS[0];
  }, [scenarioId]);

  const resonanceResult = useMemo(() => {
    if (!manifest) return null;

    const router = new AutonomousResonanceRouter();
    router.loadAssetPool(manifest.assets);
    return router.materializeEntity(selectedScenario.state);
  }, [manifest, selectedScenario]);

  if (loading) {
    return (
      <div
        className="stitch-asset-preview-panel"
        data-testid="stitch-asset-preview-panel"
      >
        <div className="stitch-asset-preview-panel__loading">
          <span className="stitch-loading-dot" />
          <span className="stitch-loading-dot" />
          <span className="stitch-loading-dot" />
          <span>Loading stitch manifest...</span>
        </div>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div
        className="stitch-asset-preview-panel stitch-asset-preview-panel--error"
        data-testid="stitch-asset-preview-panel"
      >
        <div className="stitch-asset-preview-panel__header">
          <span className="stitch-asset-preview-panel__title">STITCH ASSETS</span>
          <span className="stitch-asset-preview-panel__error-badge">error</span>
        </div>
        <div className="stitch-asset-preview-panel__error-msg">
          {error ?? "Manifest not found"}
        </div>
        <button className="stitch-asset-preview-panel__retry" onClick={loadManifest}>
          RETRY
        </button>
      </div>
    );
  }

  const stats = getManifestStats(manifest);
  const enemyAsset = getDefaultEnemySprite(manifest);
  const tileAsset = getDefaultTileSprite(manifest);
  const vfxAsset = getDefaultVfxSprite(manifest);
  const propAsset = getDefaultPropSprite(manifest);
  const buildingAsset = getDefaultBuildingSprite(manifest);
  const manualReview = getManualReviewEntries(manifest);
  const referenceOnly = getReferenceOnlyEntries(manifest);

  return (
    <div
      className="stitch-asset-preview-panel"
      data-testid="stitch-asset-preview-panel"
    >
      <div className="stitch-asset-preview-panel__header">
        <span className="stitch-asset-preview-panel__title">STITCH RESONANCE</span>
        <div className="stitch-asset-preview-panel__stats">
          <span data-testid="stitch-asset-manifest-count">
            {stats.totalAssets} assets
          </span>
          <span className="stitch-asset-preview-panel__divider">|</span>
          <span data-testid="stitch-asset-quarantine-count">
            {stats.quarantinedCount} quarantined
          </span>
        </div>
      </div>

      <div className="stitch-asset-preview-panel__pack">
        <span className="stitch-asset-preview-panel__pack-id">{manifest.packId}</span>
        <span className="stitch-asset-preview-panel__schema">v{manifest.schemaVersion}</span>
        <span className="stitch-asset-preview-panel__proof">visual proof only</span>
      </div>

      <div className="stitch-asset-preview-panel__review-stats">
        <span data-testid="stitch-asset-manual-review-count">{stats.manualReviewCount} manual review</span>
        <span data-testid="stitch-asset-reference-only-count">{stats.referenceOnlyCount} reference only</span>
      </div>

      <div className="stitch-asset-preview-panel__samples">
        <StitchAssetCard
          label="ENEMY"
          asset={enemyAsset}
          manifest={manifest}
          testId="stitch-asset-enemy-sample"
          accentColor="var(--st-fire)"
        />
        <StitchAssetCard
          label="TILE"
          asset={tileAsset}
          manifest={manifest}
          testId="stitch-asset-tile-sample"
          accentColor="var(--st-emerald)"
        />
        <StitchAssetCard
          label="VFX"
          asset={vfxAsset}
          manifest={manifest}
          testId="stitch-asset-vfx-sample"
          accentColor="var(--st-aether)"
        />
        <StitchAssetCard
          label="PROP"
          asset={propAsset}
          manifest={manifest}
          testId="stitch-asset-prop-sample"
          accentColor="var(--st-violet)"
        />
        <StitchAssetCard
          label="BUILDING"
          asset={buildingAsset}
          manifest={manifest}
          testId="stitch-asset-building-sample"
          accentColor="var(--st-gold)"
        />
      </div>

      <div className="stitch-resonance__scenario-tabs" data-testid="stitch-resonance-scenarios">
        {RESONANCE_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            className={`stitch-resonance__scenario ${scenario.id === selectedScenario.id ? "stitch-resonance__scenario--active" : ""}`}
            type="button"
            onClick={() => setScenarioId(scenario.id)}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      {resonanceResult && (
        <ResonanceProof manifest={manifest} scenario={selectedScenario} result={resonanceResult} />
      )}

      <div className="stitch-asset-preview-panel__queues">
        <QueuePreview
          title="MANUAL REVIEW"
          entries={manualReview}
          testId="stitch-manual-review-queue"
        />
        <QueuePreview
          title="REFERENCE ONLY"
          entries={referenceOnly}
          testId="stitch-reference-only-queue"
        />
      </div>

      <div className="stitch-asset-preview-panel__categories">
        <span className="stitch-asset-preview-panel__cat-label">CATEGORIES</span>
        <div className="stitch-asset-preview-panel__cat-grid">
          {Object.entries(stats.categories)
            .filter(([, count]) => count > 0)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, count]) => (
              <span key={cat} className="stitch-asset-preview-panel__cat-item">
                <span className="stitch-asset-preview-panel__cat-name">{cat}</span>
                <span className="stitch-asset-preview-panel__cat-count">{count}</span>
              </span>
            ))}
        </div>
      </div>

      <div className="stitch-asset-preview-panel__footer">
        <span className="stitch-asset-preview-panel__deterministic">
          deterministic visual side-channel
        </span>
        <span className="stitch-asset-preview-panel__frames-total">
          {stats.totalFrames} total frames
        </span>
      </div>
    </div>
  );
}

export default StitchAssetPreviewPanel;
