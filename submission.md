🎯 What: The code health issue addressed
Removed leftover `console.log` statements in `client/src/engine/playcanvas/SceneInitializer.js` (e.g. `Connecting to WebSocket`).

💡 Why: How this improves maintainability
Console.log statements are meant for debugging and should be stripped out in production. Removing them prevents console spam, making it easier to notice real warnings/errors while reducing execution overhead slightly.

✅ Verification: How you confirmed the change is safe
Ran the root `pnpm run lint` and `vitest` suites to verify client and game integrity. The changes purely remove logging statements; logic and `console.error` blocks were kept intact.

✨ Result: The improvement achieved
A cleaner execution trace for the client WebSocket initialization with zero impact on functionality.
