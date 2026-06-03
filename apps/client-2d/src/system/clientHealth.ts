import type { AreloriaBootConfig } from "../boot/boot.config";

export interface ClientHealthResult {
  ok: boolean;
  reason: string;
  details: Record<string, unknown>;
}

export async function runClientHealthCheck(
  _config: AreloriaBootConfig
): Promise<ClientHealthResult> {
  const details: Record<string, unknown> = {
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
    language: typeof navigator !== "undefined" ? navigator.language : "unknown",
    online: typeof navigator !== "undefined" ? navigator.onLine : false,
    devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
    viewport: {
      width: typeof window !== "undefined" ? window.innerWidth : 0,
      height: typeof window !== "undefined" ? window.innerHeight : 0
    }
  };

  // WebGL check
  let webglOk = false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    webglOk = Boolean(gl);
    details.webgl = Boolean(gl);

    if (gl) {
      // Get WebGL info
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        details.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        details.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      }
    }
  } catch {
    details.webgl = false;
  }

  if (!webglOk) {
    return {
      ok: false,
      reason: "WebGL ist auf diesem Gerät nicht verfügbar.",
      details
    };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      ok: false,
      reason: "Gerät ist offline. Starte im eingeschränkten Modus.",
      details
    };
  }

  // Check for minimum viewport size
  if (typeof window !== "undefined") {
    if (window.innerWidth < 320 || window.innerHeight < 240) {
      return {
        ok: false,
        reason: "Viewport zu klein für Areloria.",
        details
      };
    }
  }

  return {
    ok: true,
    reason: "Client health ok",
    details
  };
}