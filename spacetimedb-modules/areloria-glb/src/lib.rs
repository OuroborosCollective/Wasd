//! SpacetimeDB module: `glb_link` (GLB overrides) + optional `player_row` (JSON snapshot per uid).
//! Build: `spacetime build` (from this directory) then `spacetime publish <name>`.
//! Server Node still uses file fallback until HTTP/SQL or reducers write `player_row`.
use spacetimedb::table;

#[table(name = glb_link, public)]
pub struct GlbLink {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub glb_path: String,
    pub target_type: String,
    pub target_id: String,
}

/// One row per game account / uid — `json` is opaque server snapshot until typed columns land.
#[table(name = player_row, public)]
pub struct PlayerRow {
    #[primary_key]
    pub uid: String,
    pub json: String,
    pub updated_at_ms: u64,
}
