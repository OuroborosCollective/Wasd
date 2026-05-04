// @ts-nocheck
// import { NodeSDK } from '@opentelemetry/sdk-node'
// import { resourceFromAttributes } from '@opentelemetry/resources'
// import { PostHogSpanProcessor } from '@posthog/ai/otel'
// import { GenAIInstrumentation } from '@traceloop/instrumentation-google-generativeai'

/**
 * Tracing is temporarily disabled to bypass dependency resolution errors.
 */
export const initTracing = () => {
  console.log('[Tracing] Tracing is currently disabled.');
};

// const sdk = new NodeSDK({
//   resource: resourceFromAttributes({
//     'service.name': 'wasd-game',
//   }),
//   spanProcessors: [
//     new PostHogSpanProcessor({
//       apiKey: process.env.POSTHOG_API_KEY || 'phc_uSpgVzJeKQKDEDQiNxrnDNAoknUMxo8ay6wKWFYoVh8h',
//       host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
//     }) as any,
//   ],
//   instrumentations: [new GenAIInstrumentation() as any],
// })

// sdk.start()

console.log('[Tracing] OpenTelemetry initialization skipped.');
