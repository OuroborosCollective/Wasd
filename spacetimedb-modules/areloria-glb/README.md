# areloria-glb (SpacetimeDB module)

Stores **GLB model link overrides** in **`glb_link`** and an optional **`player_row`** table (`uid`, `json`, `updated_at_ms`) for future player persistence via the same published module. Node still uses `PLAYER_SAVE_FILE` until the server writes SQL/reducers against `player_row`.

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
