/**
 * PacketRouter — stub for routing incoming WebSocket packets.
 *
 * In the current architecture all message dispatch is handled inline inside
 * {@link WorldTick}'s constructor via the `onPlayerMessage` callback.
 * `PacketRouter` exists as a placeholder for a future refactor that will
 * move the message-handling logic into a dedicated routing layer, making it
 * easier to add, remove, or test individual packet handlers independently.
 *
 * @example
 * const router = new PacketRouter();
 * const result = router.route({ type: "move_intent", dx: 1, dy: 0 });
 * // result → { handled: true, type: "move_intent" }
 */
export class PacketRouter {
  /**
   * Attempts to route an incoming packet and returns a basic result object.
   *
   * Currently this is a no-op stub: it always reports `handled: true` and
   * echoes back the packet's `type` field (defaulting to `"unknown"` for
   * packets that lack a type).  Real routing logic will be introduced here
   * in a future iteration.
   *
   * @param packet - The raw, already-parsed message object received from a
   *                 client WebSocket.  Expected to have at least a `type`
   *                 string property.
   * @returns An object with:
   *   - `handled` — always `true` in this stub implementation.
   *   - `type`    — the `type` field extracted from `packet`, or `"unknown"`.
   */
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}
