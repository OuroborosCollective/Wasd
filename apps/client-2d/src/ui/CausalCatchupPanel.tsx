/**
 * CausalCatchupPanel
 *
 * Display component for CausalCatchupSummary from server.
 *
 * ARE-Rules compliance:
 * - No quest mutation
 * - No inventory mutation
 * - No NPC status invention
 * - No resource regeneration
 * - No economy price changes
 *
 * This component only displays server-provided information.
 * It does not create or mutate any gameplay truth.
 */

import type React from "react";
import type { CausalCatchupSummaryPayload, CausalCatchupEventPayload } from "../net/protocol";
import { isCausalCatchupSummaryPayload } from "../net/protocol";

export interface CausalCatchupPanelProps {
  /** The causal catchup summary payload from server */
  readonly summary: unknown;
  /** Optional CSS class name */
  readonly className?: string;
}

/**
 * Event type labels for display.
 */
const EVENT_TYPE_LABELS: Record<string, string> = {
  resource_depleted: "Resource Depleted",
  market_price_changed: "Market Price",
  npc_activity_changed: "NPC Activity",
  quest_completed: "Quest Complete",
  combat_result: "Combat",
  governance_action: "Governance",
  legend_recorded: "Legend",
};

/**
 * Get display label for an event type.
 */
function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

/**
 * Escape HTML to prevent injection from server data.
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Individual event row component.
 */
function CausalCatchupEventRow({ event }: { event: CausalCatchupEventPayload }): React.ReactElement {
  return (
    <div className="causal-catchup-event" data-event-type={event.type}>
      <span className="causal-catchup-event-type">{getEventTypeLabel(event.type)}</span>
      <span className="causal-catchup-event-tick">tick {event.tick}</span>
      <span className="causal-catchup-event-region">{escapeHtml(event.regionId)}</span>
    </div>
  );
}

/**
 * CausalCatchupPanel displays CausalCatchupSummary from server.
 *
 * Props:
 * - summary: The server-provided CausalCatchupSummaryPayload
 * - className: Optional CSS class
 *
 * Returns null if payload is invalid (no fake fallback per ARE rules).
 */
export function CausalCatchupPanel({ summary, className }: CausalCatchupPanelProps): React.ReactElement | null {
  // Validate payload - no fake fallback
  if (!isCausalCatchupSummaryPayload(summary)) {
    return null;
  }

  const typedSummary = summary as CausalCatchupSummaryPayload;

  // Only show if there are events
  if (typedSummary.eventCount === 0) {
    return null;
  }

  const tickRange = typedSummary.firstTick !== null && typedSummary.lastTick !== null
    ? `${typedSummary.firstTick} - ${typedSummary.lastTick}`
    : "unknown";

  return (
    <aside
      className={`causal-catchup-panel ${className ?? ""}`}
      aria-live="polite"
      data-event-count={typedSummary.eventCount}
    >
      <header className="causal-catchup-header">
        <h3 className="causal-catchup-title">Causal Catchup</h3>
        <span className="causal-catchup-count">{typedSummary.eventCount} event(s)</span>
      </header>

      <div className="causal-catchup-tick-range">
        Tick range: {tickRange}
      </div>

      <ul className="causal-catchup-events">
        {typedSummary.events.slice(0, 5).map((event) => (
          <li key={event.eventId}>
            <CausalCatchupEventRow event={event} />
          </li>
        ))}
        {typedSummary.events.length > 5 && (
          <li className="causal-catchup-more">
            +{typedSummary.events.length - 5} more events
          </li>
        )}
      </ul>

      <footer className="causal-catchup-footer">
        Hash: <code>{escapeHtml(typedSummary.summaryHash.substring(0, 8))}...</code>
      </footer>
    </aside>
  );
}

export default CausalCatchupPanel;
