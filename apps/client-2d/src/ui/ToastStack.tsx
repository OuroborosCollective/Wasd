import React from "react";
import type { ToastPayload } from "../net/protocol";

export interface ClientToast extends Required<ToastPayload> {
  id: string;
  createdAtMs: number;
}

interface Props {
  toasts: ClientToast[];
}

function colorForSeverity(severity: ClientToast["severity"]): string {
  switch (severity) {
    case "success":
      return "rgba(57,255,20,.22)";
    case "warning":
      return "rgba(255,209,102,.24)";
    case "error":
      return "rgba(255,65,108,.24)";
    case "info":
    default:
      return "rgba(0,229,255,.18)";
  }
}

export function ToastStack({ toasts }: Props) {
  return (
    <div
      role="region"
      aria-label="Notifications"
      style={{
        position: "fixed",
        right: 12,
        top: 12,
        zIndex: 30,
        display: "grid",
        gap: 8,
        width: "min(340px, calc(100vw - 24px))",
        pointerEvents: "none"
      }}
    >
      {toasts.map((toast) => {
        const isAlert = toast.severity === "warning" || toast.severity === "error";
        return (
          <div
            key={toast.id}
            role={isAlert ? "alert" : "status"}
            aria-live={isAlert ? "assertive" : "polite"}
            aria-atomic="true"
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.12)",
              background: colorForSeverity(toast.severity),
              color: "#f5f7ff",
              font: "13px/1.4 system-ui, sans-serif",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(0,0,0,.28)"
            }}
          >
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}