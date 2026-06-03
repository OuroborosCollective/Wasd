import React, { useEffect, useRef, useState } from "react";
import { BOOT_PHASES, type BootPhase } from "../theme/designTokens";
import { BootOverlay } from "./BootOverlay";

type BootPhaseState =
  | "BOOTING"
  | "CHECKING_DEVICE"
  | "CHECKING_SERVER"
  | "LOADING_ASSETS"
  | "CONNECTING_WORLD"
  | "SYNCING_TICK"
  | "READY"
  | "DEGRADED"
  | "OFFLINE"
  | "FATAL";

interface GameBootProps {
  onReady?: () => void;
  onDegraded?: () => void;
  onFatal?: (error: string) => void;
}

export function GameBoot({ onReady, onDegraded, onFatal }: GameBootProps): React.ReactElement {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<BootPhaseState>("BOOTING");
  const [message, setMessage] = useState("Initialisiere Areloria…");
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function boot() {
      try {
        // Phase 1: BOOTING
        setPhase("BOOTING");
        setMessage("Starte Areloria Client…");

        // Small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (disposed) return;

        // Phase 2: CHECKING_DEVICE
        setPhase("CHECKING_DEVICE");
        setMessage("Prüfe Gerät, WebGL und Browser-Fähigkeiten…");

        // Run client health check
        const healthResult = await runDeviceHealthCheck();

        if (disposed) return;

        if (!healthResult.ok) {
          setPhase("DEGRADED");
          setMessage(healthResult.reason);
          onDegraded?.();
          return;
        }

        // Phase 3: CHECKING_SERVER
        setPhase("CHECKING_SERVER");
        setMessage("Prüfe Server-Verbindung…");

        const serverOk = await checkServerHealth();
        if (disposed) return;

        if (!serverOk) {
          setPhase("OFFLINE");
          setMessage("Server nicht erreichbar. Starte im Offline-Modus.");
          onDegraded?.();
          return;
        }

        // Phase 4: LOADING_ASSETS
        setPhase("LOADING_ASSETS");
        setMessage("Lade Spiel-Assets…");

        // Phase 5: CONNECTING_WORLD
        setPhase("CONNECTING_WORLD");
        setMessage("Verbinde mit der Spielwelt…");

        // Phase 6: SYNCING_TICK
        setPhase("SYNCING_TICK");
        setMessage("Synchronisiere Spielzustand…");

        // Ready
        if (disposed) return;

        document.body.dataset.areloriaBoot = "ready";
        setPhase("READY");
        setMessage("Areloria ist bereit.");
        onReady?.();
      } catch (error) {
        console.error("[Areloria Boot]", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setPhase("FATAL");
        setFatal(errorMessage);
        onFatal?.(errorMessage);
      }
    }

    boot();

    return () => {
      disposed = true;
    };
  }, [onReady, onDegraded, onFatal]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        ref={mountRef}
        id="areloria-pixi-root"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          overflow: "hidden"
        }}
      />

      {phase !== "READY" && (
        <BootOverlay
          phase={phase as BootPhase}
          message={message}
          fatal={fatal}
        />
      )}
    </div>
  );
}

interface HealthCheckResult {
  ok: boolean;
  reason: string;
}

async function runDeviceHealthCheck(): Promise<HealthCheckResult> {
  try {
    // WebGL check
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");

    if (!gl) {
      return { ok: false, reason: "WebGL ist auf diesem Gerät nicht verfügbar." };
    }

    // Online check
    if (!navigator.onLine) {
      return { ok: false, reason: "Gerät ist offline." };
    }

    // Viewport check
    if (window.innerWidth < 320 || window.innerHeight < 240) {
      return { ok: false, reason: "Viewport zu klein für Areloria." };
    }

    return { ok: true, reason: "Gerät bereit." };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unbekannter Fehler"
    };
  }
}

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("/health", {
      method: "GET",
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    // Server health check failed - continue anyway (degraded mode)
    console.warn("[Areloria Boot] Server health check failed, continuing anyway");
    return true;
  }
}