# Guard and Ops: The Sovereignty of Logic

Maintaining a deterministic MMORPG requires rigorous operational discipline.

## 1. ARE Guard Policy
A strict boundary between **World-State Logic** and **Observer Systems**.
- **Protected Paths**: `server/src/core/systems`, `server/src/modules/loot`, etc. must remain 100% deterministic.
- **Exempt Paths**: Telemetry, logs, and UI components can use wall-clock time.

## 2. Determinism Gate
Every Pull Request must pass the Determinism Gate.
- Automated scans check for non-deterministic primitives in protected paths.
- Line-level exceptions (`/* ARE-DETERMINISM-ALLOW */`) require valid justification.

## 3. Deployment Flow (VPS + GitHub Actions)
1. **Commit**: Logic changes are pushed to GitHub.
2. **Verify**: CI runs lint, typecheck, unit tests, and the Determinism Gate.
3. **Build**: Docker images are built with OOM-safe memory settings (`--max-old-space-size=5120`).
4. **Deploy**: Images are pushed to the VPS and managed via PM2 or Docker Compose.

## 4. Admin Audit and Rollback
The GM Editor and Admin Tools provide real-time visibility into the world state.
- Every admin action is logged in the **Sovereign Audit Log**.
- The system supports "Snap-Back" rollbacks to previous deterministic ticks in case of critical logic failure.
