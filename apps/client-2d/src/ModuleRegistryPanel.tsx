import { useState } from "react";
import {
  ARELORIA_MODULE_REGISTRY,
  getModuleRegistryStats,
  getMissingModules,
  getPreviewModules,
  type RuntimeSurface,
  type ModuleStatus,
  type AreloriaModuleRegistryEntry,
} from "./ModuleRegistry";

type FilterMode = "all" | "missing" | "preview" | "surface";

function statusColor(status: ModuleStatus): string {
  switch (status) {
    case "active": return "var(--green, #70ff9e)";
    case "partial": return "var(--gold, #f6b64a)";
    case "preview": return "var(--cyan, #48e9ff)";
    case "missing": return "var(--danger, #ff416c)";
    case "legacy": return "rgba(245, 247, 255, 0.4)";
    case "future": return "rgba(245, 247, 255, 0.3)";
    default: return "var(--muted, #9fb2c7)";
  }
}

function surfaceLabel(surface: RuntimeSurface): string {
  const labels: Record<RuntimeSurface, string> = {
    "client-2d": "2D",
    "client-3d": "3D",
    "server": "Server",
    "portal": "Portal",
    "engine": "Engine",
    "shared": "Shared",
    "tooling": "Tools",
  };
  return labels[surface] ?? surface;
}

interface ModuleRowProps {
  module: AreloriaModuleRegistryEntry;
  onToggleDetails: (id: string) => void;
  showDetails: boolean;
}

function ModuleRow({ module, onToggleDetails, showDetails }: ModuleRowProps) {
  return (
    <div
      className="module-registry-row"
      style={{ borderLeft: `3px solid ${statusColor(module.status)}` }}
    >
      <div className="module-registry-row-header" onClick={() => onToggleDetails(module.id)}>
        <span className="module-id">{module.id}</span>
        <span
          className="module-status-badge"
          style={{ background: statusColor(module.status) }}
        >
          {module.status}
        </span>
        <span className="module-surface">{surfaceLabel(module.runtimeSurface)}</span>
        {module.deterministic && <span className="module-det" title="Deterministic">D</span>}
        {module.serverAuthoritative && <span className="module-auth" title="Server Authoritative">A</span>}
        {module.visibleInClient && <span className="module-vis" title="Visible">V</span>}
        {module.hasE2ETest && <span className="module-e2e" title="Has E2E Test">E2E</span>}
        <button
          className="module-expand-btn"
          aria-label={showDetails ? "Collapse" : "Expand"}
        >
          {showDetails ? "▲" : "▼"}
        </button>
      </div>

      {showDetails && (
        <div className="module-registry-row-details">
          <p><strong>Title:</strong> {module.title}</p>
          <p><strong>Notes:</strong> {module.notes}</p>
          {module.entrypoints.length > 0 && (
            <p><strong>Entrypoints:</strong> {module.entrypoints.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ModuleRegistryPanel() {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedSurface, setSelectedSurface] = useState<RuntimeSurface | "all">("all");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const stats = getModuleRegistryStats();

  const filteredModules = ARELORIA_MODULE_REGISTRY.filter((m) => {
    // Status filter
    if (filter === "missing") return m.status === "missing";
    if (filter === "preview") return m.status === "preview";
    
    // Surface filter
    if (selectedSurface !== "all") return m.runtimeSurface === selectedSurface;
    
    return true;
  });

  function toggleDetails(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="module-registry-panel" role="region" aria-label="Areloria Module Registry">
      <header className="module-registry-header">
        <h2>Module Registry</h2>
        <div className="module-registry-stats">
          <span className="stat">
            <strong>{stats.total}</strong> total
          </span>
          <span className="stat missing">
            <strong>{stats.missing}</strong> missing
          </span>
          <span className="stat preview">
            <strong>{stats.preview}</strong> preview
          </span>
          <span className="stat no-e2e">
            <strong>{stats.withoutE2E}</strong> no E2E
          </span>
        </div>
      </header>

      <nav className="module-registry-filters">
        <div className="filter-group">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({stats.total})
          </button>
          <button
            className={filter === "missing" ? "active" : ""}
            onClick={() => setFilter("missing")}
          >
            Missing ({stats.missing})
          </button>
          <button
            className={filter === "preview" ? "active" : ""}
            onClick={() => setFilter("preview")}
          >
            Preview ({stats.preview})
          </button>
        </div>

        <div className="filter-group">
          <span>Surface:</span>
          <select
            value={selectedSurface}
            onChange={(e) => setSelectedSurface(e.target.value as RuntimeSurface | "all")}
          >
            <option value="all">All</option>
            <option value="client-2d">2D ({stats.bySurface["client-2d"]})</option>
            <option value="client-3d">3D ({stats.bySurface["client-3d"]})</option>
            <option value="server">Server ({stats.bySurface["server"]})</option>
            <option value="portal">Portal ({stats.bySurface["portal"]})</option>
            <option value="shared">Shared ({stats.bySurface["shared"]})</option>
          </select>
        </div>
      </nav>

      <div className="module-registry-legend">
        <span><strong>D</strong>=Deterministic</span>
        <span><strong>A</strong>=Server-Authoritative</span>
        <span><strong>V</strong>=Visible</span>
        <span><strong>E2E</strong>=Has Test</span>
      </div>

      <div className="module-registry-list">
        {filteredModules.length === 0 ? (
          <p className="module-registry-empty">No modules match the current filter.</p>
        ) : (
          filteredModules.map((module) => (
            <ModuleRow
              key={module.id}
              module={module}
              onToggleDetails={toggleDetails}
              showDetails={expandedModules.has(module.id)}
            />
          ))
        )}
      </div>

      <footer className="module-registry-footer">
        <small>
          Runtime Registry · Areloria 2D Client · REAL_PIXI_CLIENT
        </small>
      </footer>
    </div>
  );
}

/**
 * Compact badge for embedding in other components
 */
export function ModuleRegistryBadge() {
  const stats = getModuleRegistryStats();
  
  return (
    <span
      className="module-registry-badge"
      title={`${stats.missing} missing, ${stats.preview} preview, ${stats.withoutE2E} without E2E`}
    >
      Registry: {stats.total}
      {stats.missing > 0 && <span className="badge-missing">⚠{stats.missing}</span>}
      {stats.preview > 0 && <span className="badge-preview">⚡{stats.preview}</span>}
    </span>
  );
}