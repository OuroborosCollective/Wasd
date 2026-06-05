/**
 * ARE HEARTBEAT PANEL
 * 
 * Zeigt ARE-spezifische Determinismus-Werte:
 * - tickId: Aktueller Server-Tick
 * - kappa: Positions-Koordinate (integer, 1000 = Grid-Referenz)
 * - observerCount: Anzahl verbundener Clients
 * - replayHash: Hash des aktuellen Weltzustands für Replay
 * 
 * Regeln:
 * - Kein Math.random() für ARE-Werte
 * - Kein Date.now() für Simulation
 * - Fehlende Werte als "waiting" anzeigen, nicht fälschen
 * - Date.now() ist nur erlaubt für UI-Stale-Erkennung/lastUpdated
 */

import { useEffect, useState } from "react";

export interface AREHeartbeatSnapshot {
  tickId: number | null;
  kappa: number | null; // 1000 = Grid-Referenz, null = waiting
  observerCount: number | null;
  replayHash: string | null;
  serverTick: number | null;
  heartbeatStatus: "waiting" | "live" | "stale";
  lastUpdated: number | null; // Timestamp, nicht für Simulation
}

/**
 * ARE Endpoint für Heartbeat-Daten
 */
const ARE_HEARTBEAT_ENDPOINT = "/api/are/heartbeat";

/**
 * Polling interval in milliseconds (defensive: 2s, not 10Hz)
 */
const ARE_HEARTBEAT_POLL_MS = 2000;

/**
 * Default-Snapshot (alle Werte als "waiting")
 */
export const DEFAULT_ARE_HEARTBEAT: AREHeartbeatSnapshot = {
  tickId: null,
  kappa: null,
  observerCount: null,
  replayHash: null,
  serverTick: null,
  heartbeatStatus: "waiting",
  lastUpdated: null,
};

function statusColor(status: AREHeartbeatSnapshot["heartbeatStatus"]): string {
  switch (status) {
    case "live": return "var(--green, #70ff9e)";
    case "stale": return "var(--fire, #ff7a00)";
    case "waiting":
    default: return "var(--muted, #9fb2c7)";
  }
}

function statusLabel(status: AREHeartbeatSnapshot["heartbeatStatus"]): string {
  switch (status) {
    case "live": return "LIVE";
    case "stale": return "STALE";
    case "waiting":
    default: return "WAITING";
  }
}

interface ValueCellProps {
  label: string;
  value: string | number | null;
  isWaiting: boolean;
  mono?: boolean;
}

function ValueCell({ label, value, isWaiting, mono = true }: ValueCellProps) {
  const displayValue = isWaiting ? "—" : String(value ?? "—");
  
  return (
    <div className="are-heartbeat-cell">
      <span className="are-heartbeat-label">{label}</span>
      <span
        className="are-heartbeat-value"
        style={{ fontFamily: mono ? "ui-monospace, monospace" : "inherit" }}
      >
        {displayValue}
      </span>
    </div>
  );
}

interface AREHeartbeatPanelProps {
  /** Optional: Override snapshot source (for testing) */
  snapshot?: AREHeartbeatSnapshot;
  /** Show compact version */
  compact?: boolean;
}

export function AREHeartbeatPanel({ snapshot, compact = false }: AREHeartbeatPanelProps) {
  // Internal state for live updates (unless snapshot prop provided)
  const [liveSnapshot, setLiveSnapshot] = useState<AREHeartbeatSnapshot>(
    snapshot ?? DEFAULT_ARE_HEARTBEAT
  );

  // If snapshot prop is provided, use it directly (for testing)
  // Otherwise, fetch from server
  useEffect(() => {
    if (snapshot) {
      setLiveSnapshot(snapshot);
      return;
    }

    let cancelled = false;

    async function updateHeartbeat() {
      const next = await fetchAREHeartbeat();

      if (cancelled) return;

      if (next) {
        setLiveSnapshot(next);
      } else {
        // On fetch failure, mark as stale if we have data, or waiting if not
        setLiveSnapshot((current) => ({
          ...current,
          heartbeatStatus: current.tickId === null ? "waiting" : "stale",
        }));
      }
    }

    // Initial fetch
    void updateHeartbeat();

    // Set up polling for live updates
    const interval = window.setInterval(() => {
      void updateHeartbeat();
    }, ARE_HEARTBEAT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [snapshot]);

  const data = liveSnapshot;
  const isWaiting = data.heartbeatStatus === "waiting";
  const isStale = data.heartbeatStatus === "stale";

  if (compact) {
    return (
      <span
        className="are-heartbeat-compact"
        title={`ARE: ${statusLabel(data.heartbeatStatus)}${data.tickId !== null ? ` Tick#${data.tickId}` : ""}`}
      >
        <span
          className="are-heartbeat-dot"
          style={{ background: statusColor(data.heartbeatStatus) }}
        />
        <span className="are-heartbeat-compact-label">
          ARE
        </span>
        <span className="are-heartbeat-compact-tick">
          {data.tickId !== null ? `#${data.tickId}` : "—"}
        </span>
      </span>
    );
  }

  return (
    <div
      className="are-heartbeat-panel"
      role="region"
      aria-label="ARE Heartbeat Monitor"
      data-status={data.heartbeatStatus}
    >
      <header className="are-heartbeat-header">
        <span
          className="are-heartbeat-status-dot"
          style={{ background: statusColor(data.heartbeatStatus) }}
        />
        <strong>ARE Heartbeat</strong>
        <span className="are-heartbeat-status-label" style={{ color: statusColor(data.heartbeatStatus) }}>
          {statusLabel(data.heartbeatStatus)}
        </span>
      </header>

      <div className="are-heartbeat-grid">
        <ValueCell
          label="Tick"
          value={data.tickId}
          isWaiting={data.tickId === null}
        />
        <ValueCell
          label="Kappa"
          value={data.kappa !== null ? data.kappa.toLocaleString() : null}
          isWaiting={data.kappa === null}
        />
        <ValueCell
          label="Observers"
          value={data.observerCount}
          isWaiting={data.observerCount === null}
          mono={false}
        />
        <ValueCell
          label="Server"
          value={data.serverTick}
          isWaiting={data.serverTick === null}
        />
      </div>

      <div className="are-heartbeat-replay">
        <span className="are-heartbeat-label">Replay Hash</span>
        <code className="are-heartbeat-hash">
          {data.replayHash ?? "—".repeat(16)}
        </code>
      </div>

      {isStale && (
        <div className="are-heartbeat-warning">
          ⚠ Data is stale — server may be disconnected
        </div>
      )}

      {isWaiting && (
        <div className="are-heartbeat-waiting">
          ⟳ Waiting for ARE heartbeat data from server...
        </div>
      )}

      {data.lastUpdated !== null && (
        <footer className="are-heartbeat-footer">
          <small>Last update: #{data.tickId ?? "—"}</small>
        </footer>
      )}
    </div>
  );
}

/**
 * Compact badge for embedding in other components
 */
export function AREHeartbeatBadge() {
  return <AREHeartbeatPanel compact={true} />;
}

/**
 * Fetch ARE heartbeat data from server
 * Returns null if fetch fails
 */
export async function fetchAREHeartbeat(): Promise<AREHeartbeatSnapshot | null> {
  try {
    const response = await fetch(ARE_HEARTBEAT_ENDPOINT, { cache: "no-store" });
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      tickId: data.tickId ?? null,
      kappa: data.kappa ?? null,
      observerCount: data.observerCount ?? null,
      replayHash: data.replayHash ?? null,
      serverTick: data.serverTick ?? null,
      heartbeatStatus: data.heartbeatStatus ?? "waiting",
      lastUpdated: Date.now(),
    };
  } catch {
    return null;
  }
}