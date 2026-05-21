// @ARE-GUARD-EXEMPT: Infrastructure, Meta, or Telemetry logic; not world-state critical.
/**
 * Logger.ts
 */
export const Logger = {
    log: (msg: string) => console.log(`[ARE_LOG] ${new Date().toISOString()}: ${msg}`),
    error: (msg: string) => console.error(`[ARE_CRITICAL] ${msg}`),
    audit: (action: string) => console.log(`[SYSTEM_LOG_AUDIT] ${action}`)
};