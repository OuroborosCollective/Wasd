//! Minimal SpacetimeDB module: public `glb_link` table for server-side GLB path overrides.
//! Build: `spacetime build` (from this directory) then `spacetime publish <name>`.
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
