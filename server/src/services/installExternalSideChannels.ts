import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";
import { amplitudeTelemetry } from "./amplitudeTelemetry.js";
import { quicknodeReadOnly } from "./quicknodeReadOnly.js";

let installed = false;
let unsubscribeAmplitude: (() => void) | null = null;

/**
 * Installs optional external observers. This function is deliberately called
 * from process bootstrap, never from a TickSystem. Every integration is
 * fail-closed and non-authoritative.
 */
export function installExternalSideChannels(): void {
  if (installed) return;
  installed = true;

  amplitudeTelemetry.start();
  unsubscribeAmplitude = canonicalIntentIntake.subscribe((observation) => {
    amplitudeTelemetry.observeCanonicalIntent(observation);
  });

  // Quicknode may attest external chain metadata only. It has no write/signing
  // API and no value from it is fed back into gameplay authority.
  quicknodeReadOnly.start();
}

export async function shutdownExternalSideChannels(): Promise<void> {
  unsubscribeAmplitude?.();
  unsubscribeAmplitude = null;
  quicknodeReadOnly.stop();
  await amplitudeTelemetry.shutdown();
  installed = false;
}
