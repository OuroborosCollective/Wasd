/**
 * PlayerSession — represents an active player connection.
 *
 * This type is a lightweight snapshot of the session-level information
 * associated with a single connected player.  It intentionally separates
 * *connection* metadata (socket ID, connect time) from *game* state (gold,
 * inventory, quests), which lives in the player system.
 *
 * @property id          - The socket connection ID assigned by
 *                         {@link GameWebSocketServer} at connection time.
 *                         This is a short random alphanumeric string and is
 *                         **not** the same as the character name.
 * @property name        - The character / display name chosen by the player
 *                         during the login handshake.
 * @property connectedAt - Unix timestamp (milliseconds) of when the session
 *                         was established.  Useful for session duration
 *                         tracking and idle-kick logic.
 * @property position    - Last known world-space coordinates of the player.
 *                         The `z` axis is reserved for future use; movement
 *                         currently operates on the `x`/`y` plane only.
 */
export type PlayerSession = {
  id: string;
  name: string;
  connectedAt: number;
  position: { x: number; y: number; z: number };
};
