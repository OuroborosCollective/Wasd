/**
 * SelfHeal Workshop Panel
 * Client-side panel for viewing dry-run workshop proposals.
 * Read-only - no file mutation from client.
 */

import { useState, useEffect, useCallback } from "react";
import "./selfHealWorkshop.css";

/**
 * Risk level for a proposal.
 */
export type SelfHealRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

/**
 * Dry-run result from a proposal.
 */
export interface SelfHealDryRun {
  ok: boolean;
  wouldChangeFiles: string[];
  wouldRunCommands: string[];
  warnings: string[];
  blockedReasons: string[];
}

/**
 * Rollback plan for a proposal.
 */
export interface SelfHealRollback {
  strategy: "none" | "restore_files" | "git_revert" | "manual_review";
  steps: string[];
}

/**
 * A patch proposal from the workshop.
 */
export interface SelfHealPatchProposalView {
  patchId: string;
  issueId: string;
  title: string;
  summary: string;
  riskLevel: SelfHealRiskLevel;
  dryRun: SelfHealDryRun;
  rollback: SelfHealRollback;
  createdBy: "selfheal-workshop";
  deterministic: true;
}

/**
 * Response from the workshop API.
 */
export interface SelfHealWorkshopResponse {
  ok: boolean;
  mode: "dry-run";
  proposals: SelfHealPatchProposalView[];
}

/**
 * Get color for risk level.
 */
function riskColor(level: SelfHealRiskLevel): string {
  switch (level) {
    case "LOW": return "var(--green, #70ff9e)";
    case "MEDIUM": return "var(--gold, #f6b64a)";
    case "HIGH": return "var(--danger, #ff416c)";
    case "BLOCKED": return "var(--muted, #9fb2c7)";
    default: return "var(--muted, #9fb2c7)";
  }
}

/**
 * Get icon for rollback strategy.
 */
function rollbackIcon(strategy: string): string {
  switch (strategy) {
    case "git_revert": return "↩";
    case "restore_files": return "📁";
    case "manual_review": return "👤";
    default: return "—";
  }
}

interface ProposalCardProps {
  proposal: SelfHealPatchProposalView;
  expanded: boolean;
  onToggle: () => void;
}

function ProposalCard({ proposal, expanded, onToggle }: ProposalCardProps) {
  const { dryRun, rollback, riskLevel } = proposal;
  const borderColor = riskColor(riskLevel);
  const isBlocked = riskLevel === "HIGH" || riskLevel === "BLOCKED";

  return (
    <div
      className={`selfheal-proposal ${isBlocked ? "blocked" : ""}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="proposal-header" onClick={onToggle}>
        <span
          className="risk-badge"
          style={{ background: borderColor }}
        >
          {riskLevel}
        </span>
        <span className="proposal-title">{proposal.title}</span>
        <span className="patch-id" title="Patch ID">
          {proposal.patchId}
        </span>
        <button className="expand-btn" aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div className="proposal-details">
          <div className="detail-section">
            <h4>Summary</h4>
            <p>{proposal.summary}</p>
          </div>

          <div className="detail-section">
            <h4>Issue ID</h4>
            <code>{proposal.issueId}</code>
          </div>

          <div className="detail-section">
            <h4>Dry Run</h4>
            <div className="dryrun-status">
              <span className={`status-indicator ${dryRun.ok ? "ok" : "blocked"}`}>
                {dryRun.ok ? "✓ Can Apply" : "✗ Blocked"}
              </span>
            </div>
            
            {dryRun.wouldChangeFiles.length > 0 && (
              <div className="detail-subsection">
                <h5>Would Change Files:</h5>
                <ul>
                  {dryRun.wouldChangeFiles.map((file, i) => (
                    <li key={i}><code>{file}</code></li>
                  ))}
                </ul>
              </div>
            )}

            {dryRun.warnings.length > 0 && (
              <div className="detail-subsection warnings">
                <h5>Warnings:</h5>
                <ul>
                  {dryRun.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {dryRun.blockedReasons.length > 0 && (
              <div className="detail-subsection blocked">
                <h5>Blocked Reasons:</h5>
                <ul>
                  {dryRun.blockedReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h4>Rollback Plan</h4>
            <div className="rollback-header">
              <span className="rollback-icon">{rollbackIcon(rollback.strategy)}</span>
              <span className="rollback-strategy">{rollback.strategy}</span>
            </div>
            <ul className="rollback-steps">
              {rollback.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>

          <div className="detail-section meta">
            <span>Created by: {proposal.createdBy}</span>
            <span>Deterministic: {proposal.deterministic ? "Yes" : "No"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SelfHeal Workshop Panel component.
 * Displays dry-run proposals from the server.
 */
export function SelfHealWorkshopPanel() {
  const [data, setData] = useState<SelfHealWorkshopResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const fetchWorkshop = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const resp = await fetch("/api/self-healing");
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const json: SelfHealWorkshopResponse = await resp.json();
      setData(json);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchWorkshop();
  }, [fetchWorkshop]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const proposals = data?.proposals ?? [];
  const counts = {
    total: proposals.length,
    low: proposals.filter((p) => p.riskLevel === "LOW").length,
    medium: proposals.filter((p) => p.riskLevel === "MEDIUM").length,
    high: proposals.filter((p) => p.riskLevel === "HIGH").length,
    blocked: proposals.filter((p) => p.riskLevel === "BLOCKED").length,
  };

  const lastFetchedText = lastFetched
    ? new Date(lastFetched).toLocaleTimeString()
    : "never";

  return (
    <div className="selfheal-workshop-panel" role="region" aria-label="SelfHeal Workshop">
      <header className="selfheal-header">
        <h2>SelfHeal Workshop</h2>
        <div className="selfheal-meta">
          <span className="mode-badge">DRY-RUN</span>
          <span className="fetch-time">Last: {lastFetchedText}</span>
        </div>
      </header>

      <div className="selfheal-stats">
        <span className="stat total">
          <strong>{counts.total}</strong> proposals
        </span>
        <span className="stat low">{counts.low} LOW</span>
        <span className="stat medium">{counts.medium} MEDIUM</span>
        <span className="stat high">{counts.high} HIGH</span>
        <span className="stat blocked">{counts.blocked} BLOCKED</span>
      </div>

      <div className="selfheal-actions">
        <button
          className="refresh-btn"
          onClick={fetchWorkshop}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="selfheal-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="selfheal-proposals">
        {proposals.length === 0 ? (
          <div className="empty-state">
            <p>No proposals available.</p>
            <small>
              SelfHeal Workshop shows real issues detected from the system.
              Press Refresh to re-check.
            </small>
          </div>
        ) : (
          proposals.map((proposal) => (
            <ProposalCard
              key={proposal.patchId}
              proposal={proposal}
              expanded={expandedIds.has(proposal.patchId)}
              onToggle={() => toggleExpand(proposal.patchId)}
            />
          ))
        )}
      </div>

      <footer className="selfheal-footer">
        <small>
          Read-only workshop · No auto-apply · Deterministic proposals
        </small>
      </footer>
    </div>
  );
}

export default SelfHealWorkshopPanel;