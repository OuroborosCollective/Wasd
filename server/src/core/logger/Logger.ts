/**
 * Logger.ts
 * @ARE-GUARD-EXEMPT: Logging is observability-only; timestamps are not world-state inputs.
 */
export const Logger = {
    // @ARE-GUARD-EXEMPT: Log timestamp only; not a world-state input.
    log: (msg: string) => console.log(`[ARE_LOG] ${new Date().toISOString()}: ${msg}`),
    error: (msg: string) => console.error(`[ARE_CRITICAL] ${msg}`),
    audit: (action: string) => console.log(`[SYSTEM_LOG_AUDIT] ${action}`)
};