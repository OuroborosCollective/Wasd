// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
/**
 * Logger.ts
 */
export const Logger = {
    log: (msg: string) => console.log(`[ARE_LOG] ${new Date().toISOString()}: ${msg}`),
    error: (msg: string) => console.error(`[ARE_CRITICAL] ${msg}`),
    audit: (action: string) => console.log(`[SYSTEM_LOG_AUDIT] ${action}`)
};