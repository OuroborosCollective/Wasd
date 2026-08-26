import { WorldEventBus } from "./WorldEventBus.js";

/**
 * Shared living-world event bus for server-side side-channel integrations.
 *
 * Tick systems, chat bridges and bootstrap adapters must use this single bus
 * when they need to exchange world events. Keeping this as a small explicit
 * module prevents accidental private buses that never deliver events to the
 * installed subscribers.
 */
export const sharedWorldEventBus = new WorldEventBus();
