# Amplitude Canonical-Intent Observer

Status: integration candidate for AIM-130 / GitHub #2572. This document does **not** claim live Amplitude ingestion.

## Purpose

Amplitude is an observability side-channel for already accepted `ServerCanonicalIntent` records. It is not a gameplay source, persistence layer, ordering service, tick input, manifest dependency, or world-hash input.

The only allowed direction is:

```text
client/NPC input
  -> server canonicalization
  -> CanonicalIntentIntake.record(intent)       [authoritative record]
  -> deterministic tick / reducer / hashes      [game truth]
  -> AmplitudeCanonicalIntentObserver.observe() [side-channel only]
```

The observer runs only after `CanonicalIntentIntake` has accepted the canonical intent. Its return value is ignored and exceptions are isolated so telemetry cannot roll back or alter an accepted intent.

## Event projection

One accepted intent produces one `canonical_intent_accepted` event with:

- `user_id`: HMAC-SHA256 pseudonym keyed by a private deployment-only identity salt over the canonical actor id;
- `insert_id`: canonical `intentHash` for ingestion de-duplication;
- event properties: action, tick id, logical index, received order, chunk key and canonical intent hash.

The raw actor id is never placed in the Amplitude event. The projection adds no wall-clock field to the deterministic gameplay record.

## Runtime configuration

The observer is disabled unless both values exist:

```text
AMPLITUDE_API_KEY
AMPLITUDE_IDENTITY_SALT
```

Optional controls:

```text
AMPLITUDE_REGION=us              # us | eu
AMPLITUDE_MAX_QUEUE_SIZE=2000    # bounded, drops telemetry only when full
AMPLITUDE_MAX_BATCH_SIZE=50      # HTTP V2 batch size, capped by code
```

`AMPLITUDE_IDENTITY_SALT` is private telemetry material. It must never be reused in authentication, gameplay hashing, manifests, world hashes, persistence identities, or deterministic seeds.

## Network contract

The integration uses Amplitude HTTP V2 server ingestion and only fixed Amplitude ingestion hosts:

- US: `https://api2.amplitude.com/2/httpapi`
- EU: `https://api.eu.amplitude.com/2/httpapi`

There is no runtime-configurable arbitrary telemetry URL.

## Failure semantics

Telemetry failure is observable but non-authoritative:

- missing key/salt: disabled;
- queue full: event counted as `dropped`, gameplay proceeds unchanged;
- HTTP/network failure: batch counted as `failed`, gameplay proceeds unchanged;
- successful HTTP response: batch counted as `sent`;
- no observer status participates in TickSystem, reducer results, manifest construction or world hash.

The observer exposes non-secret diagnostics (`enabled`, region, queue depth, observed/sent/failed/dropped counts, in-flight state and last HTTP status) for later operations/readback wiring.

## External state and Green rule

As of 2026-08-21 the connected Amplitude organization exposes only the auto-created `default` project (`850948`) and no ingested WASD events. Therefore:

- repository tests can prove the authority boundary and deterministic projection;
- CI can prove the exact source revision builds/tests;
- **neither proves live analytics**;
- operational Green requires real deployment credentials, real accepted gameplay intents, successful HTTP V2 ingestion, and readback of those actual events from Amplitude.

No chart/dashboard should be treated as game evidence, and no analytics claim is valid before that readback exists.
