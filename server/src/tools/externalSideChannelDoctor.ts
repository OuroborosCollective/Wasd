import { loadRootEnvFiles } from "../config/loadRootEnv.js";

loadRootEnvFiles();

async function main(): Promise<void> {
  const [{ amplitudeTelemetry }, { quicknodeReadOnly }] = await Promise.all([
    import("../services/amplitudeTelemetry.js"),
    import("../services/quicknodeReadOnly.js"),
  ]);

  const shouldProbeQuicknode = process.argv.includes("--probe-quicknode");
  if (shouldProbeQuicknode) await quicknodeReadOnly.probe();

  const amplitude = amplitudeTelemetry.getStatus();
  const quicknode = quicknodeReadOnly.getStatus();

  console.log(
    JSON.stringify(
      {
        truthClass: "SIDE_CHANNEL_DIAGNOSTICS",
        authoritativeMutationAllowed: false,
        amplitude: {
          configured: amplitude.configured,
          enabled: amplitude.enabled,
          region: amplitude.region,
          endpoint: amplitude.endpoint,
          queuedEvents: amplitude.queuedEvents,
          sentEvents: amplitude.sentEvents,
          failedEvents: amplitude.failedEvents,
          lastError: amplitude.lastError,
        },
        quicknode: {
          configured: quicknode.configured,
          enabled: quicknode.enabled,
          endpointHost: quicknode.endpointHost,
          expectedChainId: quicknode.expectedChainId,
          observedChainId: quicknode.observedChainId,
          observedBlockNumber: quicknode.observedBlockNumber,
          chainMatchesExpectation: quicknode.chainMatchesExpectation,
          successfulProbes: quicknode.successfulProbes,
          failedProbes: quicknode.failedProbes,
          configurationError: quicknode.configurationError,
          lastError: quicknode.lastError,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`[external-side-channel-doctor] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
