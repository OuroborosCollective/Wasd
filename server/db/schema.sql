BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- COMMON
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS schema_versions (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  checksum TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ENUM-LIKE LOOKUP TABLES
-- Safer than hardcoded CHECKs when the game grows.
-- ============================================================

CREATE TABLE IF NOT EXISTS item_rarities (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,
  color_hex TEXT,
  base_weight INTEGER NOT NULL DEFAULT 100,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT item_rarities_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT item_rarities_rank_chk CHECK (rank >= 0),
  CONSTRAINT item_rarities_weight_chk CHECK (base_weight >= 0)
);

INSERT INTO item_rarities(key, name, rank, color_hex, base_weight)
VALUES
  ('common', 'Common', 1, '#cccccc', 10000),
  ('magic', 'Magic', 2, '#4488ff', 3500),
  ('rare', 'Rare', 3, '#ffff55', 900),
  ('unique', 'Unique', 4, '#cc8844', 160),
  ('legendary', 'Legendary', 5, '#ff8800', 45),
  ('mythic', 'Mythic', 6, '#ff44ff', 8),
  ('artifact', 'Artifact', 7, '#ff2222', 1)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS modifier_types (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value_kind TEXT NOT NULL DEFAULT 'range',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT modifier_types_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT modifier_types_value_kind_chk CHECK (
    value_kind IN ('flat', 'range', 'percent', 'flag', 'text', 'json')
  )
);

INSERT INTO modifier_types(key, name, value_kind)
VALUES
  ('damage_flat', 'Flat Damage', 'range'),
  ('damage_percent', 'Damage Percent', 'percent'),
  ('armor_flat', 'Flat Armor', 'range'),
  ('health_flat', 'Health', 'range'),
  ('mana_flat', 'Mana', 'range'),
  ('stamina_flat', 'Stamina', 'range'),
  ('attack_speed_percent', 'Attack Speed', 'percent'),
  ('movement_speed_percent', 'Movement Speed', 'percent'),
  ('crit_chance_percent', 'Critical Chance', 'percent'),
  ('crit_damage_percent', 'Critical Damage', 'percent'),
  ('fire_damage_flat', 'Fire Damage', 'range'),
  ('ice_damage_flat', 'Ice Damage', 'range'),
  ('lightning_damage_flat', 'Lightning Damage', 'range'),
  ('poison_damage_flat', 'Poison Damage', 'range'),
  ('skill_bonus', 'Skill Bonus', 'json'),
  ('socket_count', 'Socket Count', 'range')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- BASE ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS base_item_types (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slot TEXT,
  category TEXT NOT NULL,
  max_affixes INTEGER NOT NULL DEFAULT 2,
  max_suffixes INTEGER NOT NULL DEFAULT 2,
  stackable BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT base_item_types_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT base_item_types_max_affixes_chk CHECK (max_affixes >= 0),
  CONSTRAINT base_item_types_max_suffixes_chk CHECK (max_suffixes >= 0),
  CONSTRAINT base_item_types_category_chk CHECK (
    category IN (
      'weapon',
      'armor',
      'jewelry',
      'consumable',
      'material',
      'quest',
      'currency',
      'building',
      'cosmetic',
      'tool'
    )
  )
);

CREATE TABLE IF NOT EXISTS item_blueprints (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  base_item_type TEXT NOT NULL REFERENCES base_item_types(key),
  rarity_key TEXT NOT NULL REFERENCES item_rarities(key),

  required_level INTEGER NOT NULL DEFAULT 1,
  item_level INTEGER NOT NULL DEFAULT 1,

  implicit_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  fixed_properties JSONB NOT NULL DEFAULT '{}'::jsonb,

  tags TEXT[] NOT NULL DEFAULT '{}',
  deterministic_seed TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT item_blueprints_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT item_blueprints_required_level_chk CHECK (required_level >= 1),
  CONSTRAINT item_blueprints_item_level_chk CHECK (item_level >= required_level),
  CONSTRAINT item_blueprints_implicit_object_chk CHECK (jsonb_typeof(implicit_properties) = 'object'),
  CONSTRAINT item_blueprints_fixed_object_chk CHECK (jsonb_typeof(fixed_properties) = 'object')
);

DROP TRIGGER IF EXISTS trigger_item_blueprints_updated_at ON item_blueprints;
CREATE TRIGGER trigger_item_blueprints_updated_at
BEFORE UPDATE ON item_blueprints
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- AFFIXES / SUFFIXES / MODIFIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS item_modifiers (
  id BIGSERIAL PRIMARY KEY,

  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  modifier_family TEXT NOT NULL,
  modifier_type TEXT NOT NULL REFERENCES modifier_types(key),

  min_value NUMERIC(20, 6),
  max_value NUMERIC(20, 6),

  required_level INTEGER NOT NULL DEFAULT 1,
  tier INTEGER NOT NULL DEFAULT 1,
  weight INTEGER NOT NULL DEFAULT 100,

  allowed_base_types TEXT[] NOT NULL DEFAULT '{}',
  blocked_base_types TEXT[] NOT NULL DEFAULT '{}',

  allowed_rarities TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT item_modifiers_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT item_modifiers_family_chk CHECK (
    modifier_family IN ('prefix', 'suffix', 'implicit', 'unique_fixed', 'corrupted', 'crafted', 'legend')
  ),
  CONSTRAINT item_modifiers_range_chk CHECK (
    min_value IS NULL OR max_value IS NULL OR min_value <= max_value
  ),
  CONSTRAINT item_modifiers_required_level_chk CHECK (required_level >= 1),
  CONSTRAINT item_modifiers_tier_chk CHECK (tier >= 1),
  CONSTRAINT item_modifiers_weight_chk CHECK (weight >= 0),
  CONSTRAINT item_modifiers_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);

DROP TRIGGER IF EXISTS trigger_item_modifiers_updated_at ON item_modifiers;
CREATE TRIGGER trigger_item_modifiers_updated_at
BEFORE UPDATE ON item_modifiers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Compatibility view for your old naming.
CREATE OR REPLACE VIEW affixes AS
SELECT *
FROM item_modifiers
WHERE modifier_family = 'prefix';

CREATE OR REPLACE VIEW suffixes AS
SELECT *
FROM item_modifiers
WHERE modifier_family = 'suffix';

-- ============================================================
-- MODIFIER POOLS
-- Example: desert_swords_lvl_20, undead_boss_suffix_pool, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS modifier_pools (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  pool_type TEXT NOT NULL DEFAULT 'generic',
  required_level_min INTEGER NOT NULL DEFAULT 1,
  required_level_max INTEGER,

  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT modifier_pools_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT modifier_pools_level_chk CHECK (
    required_level_max IS NULL OR required_level_min <= required_level_max
  ),
  CONSTRAINT modifier_pools_type_chk CHECK (
    pool_type IN ('generic', 'biome', 'boss', 'dungeon', 'faction', 'season', 'crafting', 'event')
  )
);

DROP TRIGGER IF EXISTS trigger_modifier_pools_updated_at ON modifier_pools;
CREATE TRIGGER trigger_modifier_pools_updated_at
BEFORE UPDATE ON modifier_pools
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS modifier_pool_entries (
  pool_id BIGINT NOT NULL REFERENCES modifier_pools(id) ON DELETE CASCADE,
  modifier_id BIGINT NOT NULL REFERENCES item_modifiers(id) ON DELETE CASCADE,

  weight INTEGER NOT NULL DEFAULT 100,
  min_item_level INTEGER NOT NULL DEFAULT 1,
  max_item_level INTEGER,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (pool_id, modifier_id),

  CONSTRAINT modifier_pool_entries_weight_chk CHECK (weight >= 0),
  CONSTRAINT modifier_pool_entries_level_chk CHECK (
    max_item_level IS NULL OR min_item_level <= max_item_level
  ),
  CONSTRAINT modifier_pool_entries_metadata_chk CHECK (jsonb_typeof(metadata) = 'object')
);

-- ============================================================
-- LOOT TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS loot_tables (
  id BIGSERIAL PRIMARY KEY,

  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  source_type TEXT NOT NULL,
  source_key TEXT,

  required_level_min INTEGER NOT NULL DEFAULT 1,
  required_level_max INTEGER,

  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT loot_tables_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT loot_tables_source_type_chk CHECK (
    source_type IN (
      'npc',
      'boss',
      'chest',
      'quest',
      'dungeon',
      'biome',
      'region',
      'event',
      'crafting',
      'vendor',
      'system'
    )
  ),
  CONSTRAINT loot_tables_level_chk CHECK (
    required_level_max IS NULL OR required_level_min <= required_level_max
  ),
  CONSTRAINT loot_tables_metadata_chk CHECK (jsonb_typeof(metadata) = 'object')
);

DROP TRIGGER IF EXISTS trigger_loot_tables_updated_at ON loot_tables;
CREATE TRIGGER trigger_loot_tables_updated_at
BEFORE UPDATE ON loot_tables
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS loot_table_entries (
  id BIGSERIAL PRIMARY KEY,

  loot_table_id BIGINT NOT NULL REFERENCES loot_tables(id) ON DELETE CASCADE,

  entry_type TEXT NOT NULL,
  blueprint_id BIGINT REFERENCES item_blueprints(id) ON DELETE CASCADE,
  child_loot_table_id BIGINT REFERENCES loot_tables(id) ON DELETE CASCADE,

  rarity_key TEXT REFERENCES item_rarities(key),

  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER NOT NULL DEFAULT 1,

  weight INTEGER NOT NULL DEFAULT 100,
  drop_chance NUMERIC(10, 8) NOT NULL DEFAULT 1.0,

  modifier_pool_id BIGINT REFERENCES modifier_pools(id) ON DELETE SET NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT loot_table_entries_type_chk CHECK (
    entry_type IN ('blueprint', 'currency', 'material', 'child_table', 'nothing')
  ),

  CONSTRAINT loot_table_entries_quantity_chk CHECK (
    min_quantity >= 0 AND max_quantity >= min_quantity
  ),

  CONSTRAINT loot_table_entries_weight_chk CHECK (weight >= 0),

  CONSTRAINT loot_table_entries_drop_chance_chk CHECK (
    drop_chance >= 0 AND drop_chance <= 1
  ),

  CONSTRAINT loot_table_entries_metadata_chk CHECK (jsonb_typeof(metadata) = 'object'),

  CONSTRAINT loot_table_entries_target_chk CHECK (
    (
      entry_type = 'blueprint'
      AND blueprint_id IS NOT NULL
      AND child_loot_table_id IS NULL
    )
    OR
    (
      entry_type = 'child_table'
      AND child_loot_table_id IS NOT NULL
      AND blueprint_id IS NULL
    )
    OR
    (
      entry_type IN ('currency', 'material', 'nothing')
    )
  )
);

-- Prevent direct self-reference in nested loot table.
ALTER TABLE loot_table_entries
DROP CONSTRAINT IF EXISTS loot_table_entries_no_self_child_chk;

ALTER TABLE loot_table_entries
ADD CONSTRAINT loot_table_entries_no_self_child_chk
CHECK (
  child_loot_table_id IS NULL
  OR child_loot_table_id <> loot_table_id
);

-- ============================================================
-- MATERIALIZED ITEM INSTANCES
-- This stores actual dropped/owned items.
-- Blueprint + seed + rolled_modifiers = deterministic item.
-- ============================================================

CREATE TABLE IF NOT EXISTS item_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  owner_entity_id TEXT,
  location_type TEXT NOT NULL DEFAULT 'world',
  location_key TEXT,

  blueprint_id BIGINT NOT NULL REFERENCES item_blueprints(id) ON DELETE RESTRICT,
  rarity_key TEXT NOT NULL REFERENCES item_rarities(key),

  deterministic_seed TEXT NOT NULL,

  item_level INTEGER NOT NULL DEFAULT 1,
  required_level INTEGER NOT NULL DEFAULT 1,

  rolled_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  rolled_properties JSONB NOT NULL DEFAULT '{}'::jsonb,

  durability_current INTEGER,
  durability_max INTEGER,

  stack_quantity INTEGER NOT NULL DEFAULT 1,

  bound_state TEXT NOT NULL DEFAULT 'unbound',

  created_by_event_id TEXT,
  created_by_loot_roll_id UUID,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT item_instances_location_type_chk CHECK (
    location_type IN ('world', 'inventory', 'equipment', 'bank', 'mail', 'auction', 'vendor', 'deleted')
  ),

  CONSTRAINT item_instances_level_chk CHECK (
    item_level >= 1 AND required_level >= 1
  ),

  CONSTRAINT item_instances_rolled_modifiers_array_chk CHECK (
    jsonb_typeof(rolled_modifiers) = 'array'
  ),

  CONSTRAINT item_instances_rolled_properties_object_chk CHECK (
    jsonb_typeof(rolled_properties) = 'object'
  ),

  CONSTRAINT item_instances_stack_quantity_chk CHECK (stack_quantity >= 1),

  CONSTRAINT item_instances_durability_chk CHECK (
    durability_current IS NULL
    OR durability_max IS NULL
    OR (
      durability_current >= 0
      AND durability_max >= 0
      AND durability_current <= durability_max
    )
  ),

  CONSTRAINT item_instances_bound_state_chk CHECK (
    bound_state IN ('unbound', 'bind_on_pickup', 'bind_on_equip', 'bound')
  )
);

DROP TRIGGER IF EXISTS trigger_item_instances_updated_at ON item_instances;
CREATE TRIGGER trigger_item_instances_updated_at
BEFORE UPDATE ON item_instances
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- LOOT ROLL AUDIT
-- Critical against dupes and exploit debugging.
-- ============================================================

CREATE TABLE IF NOT EXISTS loot_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  roll_key TEXT NOT NULL UNIQUE,
  deterministic_seed TEXT NOT NULL,

  source_type TEXT NOT NULL,
  source_key TEXT NOT NULL,

  actor_entity_id TEXT,
  session_id TEXT,
  tick_index BIGINT,

  loot_table_id BIGINT REFERENCES loot_tables(id) ON DELETE SET NULL,

  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_item_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT loot_rolls_roll_key_chk CHECK (roll_key ~ '^[a-zA-Z0-9_:\-\.]+$'),
  CONSTRAINT loot_rolls_tick_index_chk CHECK (tick_index IS NULL OR tick_index >= 0),
  CONSTRAINT loot_rolls_input_object_chk CHECK (jsonb_typeof(input_payload) = 'object'),
  CONSTRAINT loot_rolls_output_object_chk CHECK (jsonb_typeof(output_payload) = 'object')
);

-- ============================================================
-- CRAFTING / UPGRADE / CORRUPTION RULES
-- ============================================================

CREATE TABLE IF NOT EXISTS item_transform_rules (
  id BIGSERIAL PRIMARY KEY,

  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  transform_type TEXT NOT NULL,

  input_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_mutation JSONB NOT NULL DEFAULT '{}'::jsonb,

  success_chance NUMERIC(10, 8) NOT NULL DEFAULT 1.0,
  deterministic_namespace TEXT NOT NULL DEFAULT 'item_transform',

  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT item_transform_rules_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT item_transform_rules_type_chk CHECK (
    transform_type IN (
      'craft',
      'upgrade',
      'reroll_prefix',
      'reroll_suffix',
      'corrupt',
      'repair',
      'socket',
      'enchant',
      'reforge',
      'salvage'
    )
  ),
  CONSTRAINT item_transform_rules_success_chk CHECK (
    success_chance >= 0 AND success_chance <= 1
  ),
  CONSTRAINT item_transform_rules_input_chk CHECK (jsonb_typeof(input_filter) = 'object'),
  CONSTRAINT item_transform_rules_cost_chk CHECK (jsonb_typeof(cost_payload) = 'object'),
  CONSTRAINT item_transform_rules_output_chk CHECK (jsonb_typeof(output_mutation) = 'object')
);

DROP TRIGGER IF EXISTS trigger_item_transform_rules_updated_at ON item_transform_rules;
CREATE TRIGGER trigger_item_transform_rules_updated_at
BEFORE UPDATE ON item_transform_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- LEGEND DAG
-- ============================================================

CREATE TABLE IF NOT EXISTS legend_nodes (
  id BIGSERIAL PRIMARY KEY,

  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,

  node_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  deterministic_rank INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT legend_nodes_key_chk CHECK (key ~ '^[a-z0-9_:\-]+$'),
  CONSTRAINT legend_nodes_type_chk CHECK (
    node_type IN (
      'root',
      'epoch',
      'region',
      'biome',
      'faction',
      'npc',
      'boss',
      'item_family',
      'unique_item',
      'quest',
      'skill',
      'crafting',
      'dungeon',
      'event',
      'lore',
      'system'
    )
  ),
  CONSTRAINT legend_nodes_metadata_chk CHECK (jsonb_typeof(metadata) = 'object')
);

DROP TRIGGER IF EXISTS trigger_legend_nodes_updated_at ON legend_nodes;
CREATE TRIGGER trigger_legend_nodes_updated_at
BEFORE UPDATE ON legend_nodes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS legend_edges (
  parent_id BIGINT NOT NULL REFERENCES legend_nodes(id) ON DELETE CASCADE,
  child_id BIGINT NOT NULL REFERENCES legend_nodes(id) ON DELETE CASCADE,

  edge_type TEXT NOT NULL DEFAULT 'contains',
  weight INTEGER NOT NULL DEFAULT 100,
  unlock_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (parent_id, child_id, edge_type),

  CONSTRAINT legend_edges_no_self_reference_chk CHECK (parent_id <> child_id),
  CONSTRAINT legend_edges_weight_chk CHECK (weight >= 0),
  CONSTRAINT legend_edges_unlock_rule_chk CHECK (jsonb_typeof(unlock_rule) = 'object'),
  CONSTRAINT legend_edges_metadata_chk CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT legend_edges_type_chk CHECK (
    edge_type IN (
      'contains',
      'unlocks',
      'requires',
      'evolves_to',
      'belongs_to',
      'drops_from',
      'guards',
      'corrupts',
      'heals',
      'references',
      'crafts_into',
      'summons',
      'teaches',
      'opposes',
      'allied_with'
    )
  )
);

CREATE OR REPLACE FUNCTION check_legend_cycle()
RETURNS TRIGGER AS $$
DECLARE
  found_cycle BOOLEAN;
BEGIN
  IF NEW.parent_id = NEW.child_id THEN
    RAISE EXCEPTION
      'Self-reference is not allowed in legend_edges: % -> %',
      NEW.parent_id,
      NEW.child_id;
  END IF;

  WITH RECURSIVE path_search(child_id) AS (
    SELECT e.child_id
    FROM legend_edges e
    WHERE e.parent_id = NEW.child_id

    UNION ALL

    SELECT e.child_id
    FROM legend_edges e
    INNER JOIN path_search ps
      ON e.parent_id = ps.child_id
  )
  SELECT EXISTS (
    SELECT 1
    FROM path_search
    WHERE child_id = NEW.parent_id
  )
  INTO found_cycle;

  IF found_cycle THEN
    RAISE EXCEPTION
      'Cycle detected in legend DAG: edge % -> % would create a loop',
      NEW.parent_id,
      NEW.child_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_legend_cycle ON legend_edges;
CREATE TRIGGER trigger_check_legend_cycle
BEFORE INSERT OR UPDATE ON legend_edges
FOR EACH ROW
EXECUTE FUNCTION check_legend_cycle();

-- ============================================================
-- DETERMINISTIC ROLL FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION deterministic_roll_0_1(
  seed TEXT,
  namespace TEXT,
  salt TEXT DEFAULT ''
)
RETURNS NUMERIC AS $$
DECLARE
  digest_hex TEXT;
  roll_bigint NUMERIC;
BEGIN
  digest_hex := encode(
    digest(seed || ':' || namespace || ':' || salt, 'sha256'),
    'hex'
  );

  roll_bigint := (
    ('x' || substr(digest_hex, 1, 15))::bit(60)::bigint
  )::numeric;

  RETURN roll_bigint / ((2::numeric ^ 60) - 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION deterministic_roll_range(
  seed TEXT,
  namespace TEXT,
  salt TEXT,
  min_value NUMERIC,
  max_value NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  r NUMERIC;
BEGIN
  IF min_value IS NULL OR max_value IS NULL THEN
    RETURN NULL;
  END IF;

  IF min_value > max_value THEN
    RAISE EXCEPTION
      'Invalid deterministic range: min_value % > max_value %',
      min_value,
      max_value;
  END IF;

  r := deterministic_roll_0_1(seed, namespace, salt);
  RETURN min_value + ((max_value - min_value) * r);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION deterministic_roll_int(
  seed TEXT,
  namespace TEXT,
  salt TEXT,
  min_value INTEGER,
  max_value INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  r NUMERIC;
BEGIN
  IF min_value > max_value THEN
    RAISE EXCEPTION
      'Invalid deterministic int range: % > %',
      min_value,
      max_value;
  END IF;

  r := deterministic_roll_0_1(seed, namespace, salt);

  RETURN floor(min_value + ((max_value - min_value + 1) * r))::integer;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- ACTIVE VIEWS
-- ============================================================

CREATE OR REPLACE VIEW active_item_blueprints AS
SELECT *
FROM item_blueprints
WHERE enabled = TRUE;

CREATE OR REPLACE VIEW active_item_modifiers AS
SELECT *
FROM item_modifiers
WHERE enabled = TRUE;

CREATE OR REPLACE VIEW active_modifier_pools AS
SELECT *
FROM modifier_pools
WHERE enabled = TRUE;

CREATE OR REPLACE VIEW active_loot_tables AS
SELECT *
FROM loot_tables
WHERE enabled = TRUE;

CREATE OR REPLACE VIEW active_legend_nodes AS
SELECT *
FROM legend_nodes
WHERE enabled = TRUE;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_base_item_types_category
  ON base_item_types(category);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_key
  ON item_blueprints(key);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_base_item_type
  ON item_blueprints(base_item_type);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_rarity
  ON item_blueprints(rarity_key);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_required_level
  ON item_blueprints(required_level);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_enabled
  ON item_blueprints(enabled);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_tags
  ON item_blueprints USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_item_blueprints_fixed_properties
  ON item_blueprints USING GIN(fixed_properties);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_key
  ON item_modifiers(key);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_family
  ON item_modifiers(modifier_family);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_type
  ON item_modifiers(modifier_type);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_required_level
  ON item_modifiers(required_level);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_tier
  ON item_modifiers(tier);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_enabled
  ON item_modifiers(enabled);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_tags
  ON item_modifiers USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_item_modifiers_metadata
  ON item_modifiers USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_modifier_pools_key
  ON modifier_pools(key);

CREATE INDEX IF NOT EXISTS idx_modifier_pools_type
  ON modifier_pools(pool_type);

CREATE INDEX IF NOT EXISTS idx_modifier_pool_entries_pool
  ON modifier_pool_entries(pool_id);

CREATE INDEX IF NOT EXISTS idx_modifier_pool_entries_modifier
  ON modifier_pool_entries(modifier_id);

CREATE INDEX IF NOT EXISTS idx_loot_tables_key
  ON loot_tables(key);

CREATE INDEX IF NOT EXISTS idx_loot_tables_source
  ON loot_tables(source_type, source_key);

CREATE INDEX IF NOT EXISTS idx_loot_tables_enabled
  ON loot_tables(enabled);

CREATE INDEX IF NOT EXISTS idx_loot_table_entries_table
  ON loot_table_entries(loot_table_id);

CREATE INDEX IF NOT EXISTS idx_loot_table_entries_blueprint
  ON loot_table_entries(blueprint_id);

CREATE INDEX IF NOT EXISTS idx_loot_table_entries_child
  ON loot_table_entries(child_loot_table_id);

CREATE INDEX IF NOT EXISTS idx_item_instances_owner
  ON item_instances(owner_entity_id);

CREATE INDEX IF NOT EXISTS idx_item_instances_location
  ON item_instances(location_type, location_key);

CREATE INDEX IF NOT EXISTS idx_item_instances_blueprint
  ON item_instances(blueprint_id);

CREATE INDEX IF NOT EXISTS idx_item_instances_rarity
  ON item_instances(rarity_key);

CREATE INDEX IF NOT EXISTS idx_item_instances_seed
  ON item_instances(deterministic_seed);

CREATE INDEX IF NOT EXISTS idx_item_instances_rolled_modifiers
  ON item_instances USING GIN(rolled_modifiers);

CREATE INDEX IF NOT EXISTS idx_item_instances_rolled_properties
  ON item_instances USING GIN(rolled_properties);

CREATE INDEX IF NOT EXISTS idx_loot_rolls_roll_key
  ON loot_rolls(roll_key);

CREATE INDEX IF NOT EXISTS idx_loot_rolls_source
  ON loot_rolls(source_type, source_key);

CREATE INDEX IF NOT EXISTS idx_loot_rolls_actor
  ON loot_rolls(actor_entity_id);

CREATE INDEX IF NOT EXISTS idx_loot_rolls_session_tick
  ON loot_rolls(session_id, tick_index);

CREATE INDEX IF NOT EXISTS idx_legend_nodes_key
  ON legend_nodes(key);

CREATE INDEX IF NOT EXISTS idx_legend_nodes_type
  ON legend_nodes(node_type);

CREATE INDEX IF NOT EXISTS idx_legend_nodes_enabled
  ON legend_nodes(enabled);

CREATE INDEX IF NOT EXISTS idx_legend_nodes_metadata
  ON legend_nodes USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_legend_edges_parent
  ON legend_edges(parent_id);

CREATE INDEX IF NOT EXISTS idx_legend_edges_child
  ON legend_edges(child_id);

CREATE INDEX IF NOT EXISTS idx_legend_edges_type
  ON legend_edges(edge_type);

CREATE INDEX IF NOT EXISTS idx_legend_edges_unlock_rule
  ON legend_edges USING GIN(unlock_rule);

COMMIT;
