/**
 * StitchAssetPreviewPanel.tsx
 *
 * Cyber-Zen styled preview panel for Stitch 2.5D atlas assets.
 * Displays sample assets (enemy, tile, vfx, prop) with manifest stats.
 *
 * Data-testid attributes for E2E testing:
 *   data-testid="stitch-asset-preview-panel"
 *   data-testid="stitch-asset-enemy-sample"
 *   data-testid="stitch-asset-tile-sample"
 *   data-testid="stitch-asset-vfx-sample"
 *   data-testid="stitch-asset-prop-sample"
 *   data-testid="stitch-asset-manifest-count"
 *   data-testid="stitch-asset-quarantine-count"
 */

import { useCallback, useEffect, useState } from "react";
import {
  fetchStitchManifest,
  getDefaultEnemySprite,
  getDefaultTileSprite,
  getDefaultVfxSprite,
  getDefaultPropSprite,
  getManifestStats,
  stitchImageUrl,
  type StitchRuntimeManifest,
  type StitchRuntimeAsset,
} from "../../game/stitchAssetManifest";

import "./stitchAssetPreviewPanel.css";

interface StitchAssetCardProps {
  label: string;
  asset: StitchRuntimeAsset | undefined;
  manifest: StitchRuntimeManifest;
  testId: string;
  accentColor: string;
}

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
        <span className="stitch-asset-card__id">{asset.assetId}</span>
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

export function StitchAssetPreviewPanel() {
  const [manifest, setManifest] = useState<StitchRuntimeManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManifest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchStitchManifest();
      setManifest(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifest");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

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

  return (
    <div
      className="stitch-asset-preview-panel"
      data-testid="stitch-asset-preview-panel"
    >
      {/* Header */}
      <div className="stitch-asset-preview-panel__header">
        <span className="stitch-asset-preview-panel__title">STITCH ASSETS</span>
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

      {/* Pack info */}
      <div className="stitch-asset-preview-panel__pack">
        <span className="stitch-asset-preview-panel__pack-id">{manifest.packId}</span>
        <span className="stitch-asset-preview-panel__schema">v{manifest.schemaVersion}</span>
      </div>

      {/* Sample assets grid */}
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
      </div>

      {/* Category breakdown */}
      <div className="stitch-asset-preview-panel__categories">
        <span className="stitch-asset-preview-panel__cat-label">CATEGORIES</span>
        <div className="stitch-asset-preview-panel__cat-grid">
          {Object.entries(stats.categories)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, count]) => (
              <span key={cat} className="stitch-asset-preview-panel__cat-item">
                <span className="stitch-asset-preview-panel__cat-name">{cat}</span>
                <span className="stitch-asset-preview-panel__cat-count">{count}</span>
              </span>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="stitch-asset-preview-panel__footer">
        <span className="stitch-asset-preview-panel__deterministic">
          deterministic
        </span>
        <span className="stitch-asset-preview-panel__frames-total">
          {stats.totalFrames} total frames
        </span>
      </div>
    </div>
  );
}

export default StitchAssetPreviewPanel;