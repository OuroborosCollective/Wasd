/**
 * BootSurface - Boot-safe shell that prevents blank screens after login
 *
 * Provides explicit UI states for renderer boot failures:
 * - waiting: Initial state before boot starts
 * - initializing: Renderer is being set up
 * - ready: Renderer is fully initialized
 * - degraded: Renderer partially initialized, showing diagnostic
 * - error: Renderer failed to initialize
 *
 * This component ensures the HUD shell remains visible even if
 * Pixi/world rendering fails.
 */

import React from "react";

export type BootState =
  | "waiting"
  | "initializing"
  | "ready"
  | "degraded"
  | "error";

export interface BootSurfaceProps {
  bootState: BootState;
  error?: unknown;
  children: React.ReactNode;
  /** Human-readable status message for diagnostics */
  diagnosticMessage?: string;
}

const BOOT_STATE_LABELS: Record<BootState, string> = {
  waiting: "Waiting for boot…",
  initializing: "Initializing renderer…",
  ready: "Ready",
  degraded: "Degraded mode",
  error: "Boot error",
};

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error ?? "Unknown error");
}

function formatStack(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return error.stack;
  }
  return "";
}

/**
 * BootSurface wraps children and shows a diagnostic overlay when
 * the renderer fails to boot properly.
 *
 * Usage:
 * ```tsx
 * <BootSurface bootState={bootState} error={bootError}>
 *   <DeterministicWorldIsoApp />
 * </BootSurface>
 * ```
 */
export function BootSurface({
  bootState,
  error,
  children,
  diagnosticMessage,
}: BootSurfaceProps): React.ReactElement {
  const isDiagnosticState = bootState === "error" || bootState === "degraded";

  if (isDiagnosticState) {
    return (
      <div
        data-testid="client-2d-boot-diagnostic"
        data-boot-state={bootState}
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "linear-gradient(180deg, rgba(7,7,17,.96), rgba(7,7,17,.88))",
          color: "#f5f7ff",
          fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: "min(520px, 92vw)",
            borderRadius: 22,
            padding: 24,
            border: `1px solid ${bootState === "error" ? "rgba(255,65,108,.55)" : "rgba(255,165,0,.42)"}`,
            background: bootState === "error"
              ? "rgba(255,65,108,.08)"
              : "rgba(255,165,0,.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              opacity: 0.72,
              color: bootState === "error" ? "#ff416c" : "#ff7a00",
            }}
          >
            {BOOT_STATE_LABELS[bootState]}
          </div>

          <h1
            style={{
              fontSize: 20,
              marginTop: 10,
              marginBottom: 0,
              color: bootState === "error" ? "#ff416c" : "#ffb347",
            }}
          >
            ⚠ Areloria boot diagnostic
          </h1>

          <p
            style={{
              marginTop: 14,
              lineHeight: 1.55,
              opacity: 0.82,
            }}
          >
            {diagnosticMessage ?? (
              bootState === "error"
                ? "The world renderer failed to start. The UI shell is still alive."
                : "The world renderer is running in degraded mode. Some features may be limited."
            )}
          </p>

          {error && (
            <pre
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 10,
                background: "rgba(0,0,0,.48)",
                color: "#ff9f7a",
                fontSize: 11,
                lineHeight: 1.5,
                overflow: "auto",
                maxHeight: "30vh",
                textAlign: "left",
              }}
            >
              {formatError(error)}
              {"\n\n"}
              {formatStack(error)}
            </pre>
          )}

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "none",
                background: bootState === "error"
                  ? "linear-gradient(135deg,#ff416c,#ff7a00)"
                  : "linear-gradient(135deg,#ff7a00,#ffb347)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: ".04em",
              }}
            >
              Reload
            </button>

            <button
              onClick={() => {
                const body = document.body;
                if (body) {
                  body.dataset.areloriaBoot = "cold";
                  window.location.reload();
                }
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,.22)",
                background: "transparent",
                color: "#f5f7ff",
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: ".04em",
              }}
            >
              Hard Reset
            </button>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,.1)",
              fontSize: 11,
              opacity: 0.48,
              letterSpacing: ".06em",
            }}
          >
            Areloria · BootSurface · {bootState}
          </div>
        </div>

        {/* Still render children below the diagnostic overlay */}
        <div style={{ position: "absolute", visibility: "hidden" }}>
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}