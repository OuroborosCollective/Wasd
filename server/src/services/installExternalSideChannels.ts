import { canonicalIntentIntake } from "../intents/CanonicalIntentIntake.js";
import { amplitudeTelemetry } from "./amplitudeTelemetry.js";

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
}

export async function shutdownExternalSideChannels(): Promise<void> {
  unsubscribeAmplitude?.();
  unsubscribeAmplitude = null;
  await amplitudeTelemetry.shutdown();
  installed = false;
}
