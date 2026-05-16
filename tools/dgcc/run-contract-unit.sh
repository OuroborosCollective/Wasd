#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
exec pnpm exec vitest run \
  server/src/tests/validate-content-core.test.ts \
  server/src/tests/audit-content-model-paths.test.ts \
  server/src/tests/resolveLoginIdentity.test.ts \
  server/src/tests/protocol-types.test.ts \
  server/src/tests/supabaseUpstreamBaseUrl.test.ts \
  server/src/tests/worldtick-persistence-init.test.ts \
  server/src/tests/persistence-driver.test.ts \
  server/src/tests/lazySupabaseServiceRole.test.ts
