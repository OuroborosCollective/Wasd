# areloria-glb (SpacetimeDB module)

Stores **GLB model link overrides** (`glb_path`, `target_type`, `target_id`) in a **public** table `glb_link` so the game server can replace the JSON file `game-data/glb-links.json` when `GLB_LINKS_STORE=spacetime` is set.

## Requirements

- **Rust** toolchain new enough for `spacetimedb` **2.1** (the crate currently targets **Rust 1.93+**; use `rustup update` on your VPS if `cargo build` fails). Running `cargo` here generates a local `Cargo.lock` (gitignored in the monorepo).
- [SpacetimeDB CLI](https://spacetimedb.com/docs/) (`spacetime`) installed and logged in.

## Publish

From this directory:

```bash
spacetime build
spacetime publish areloria-glb
```

Use the same database name in `SPACETIME_GLB_MODULE_NAME` (or `SPACETIME_MODULE_NAME`) on the Node server.

## Server env

- `SPACETIME_DB_URL=wss://…` — Spacetime host WebSocket URL  
- `SPACETIME_GLB_MODULE_NAME=areloria-glb` — published module name  
- `SPACETIME_TOKEN=…` — Bearer token if the database is not anonymously writable  
- `GLB_LINKS_STORE=spacetime` — use Spacetime for links instead of `glb-links.json`

The Node server talks to Spacetime via **HTTP** `POST …/v1/database/:name/sql` (see `server/src/modules/spacetime/`).
