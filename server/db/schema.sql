CREATE TABLE IF NOT EXISTS affixes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    modifier_type VARCHAR(100),
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suffixes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    modifier_type VARCHAR(100),
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS unique_blueprints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    base_item_type VARCHAR(100),
    required_level INTEGER,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legend_nodes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    node_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legend_edges (
    parent_id INTEGER REFERENCES legend_nodes(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES legend_nodes(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_id, child_id),
    CONSTRAINT no_self_reference CHECK (parent_id <> child_id)
);

CREATE OR REPLACE FUNCTION check_legend_cycle()
RETURNS TRIGGER AS $$
DECLARE
    found_cycle BOOLEAN;
BEGIN
    IF NEW.parent_id = NEW.child_id THEN
        RAISE EXCEPTION 'Self-reference is not allowed';
    END IF;

    WITH RECURSIVE path_search AS (
        SELECT child_id
        FROM legend_edges
        WHERE parent_id = NEW.child_id
        UNION ALL
        SELECT e.child_id
        FROM legend_edges e
        INNER JOIN path_search ps ON e.parent_id = ps.child_id
    )
    SELECT EXISTS (
        SELECT 1 FROM path_search WHERE child_id = NEW.parent_id
    ) INTO found_cycle;

    IF found_cycle THEN
        RAISE EXCEPTION 'Cycle detected in legend DAG: insertion of edge % -> % would create a loop', NEW.parent_id, NEW.child_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_legend_cycle
BEFORE INSERT OR UPDATE ON legend_edges
FOR EACH ROW
EXECUTE FUNCTION check_legend_cycle();

CREATE INDEX idx_legend_edges_parent ON legend_edges(parent_id);
CREATE INDEX idx_legend_edges_child ON legend_edges(child_id);
CREATE INDEX idx_affixes_name ON affixes(name);
CREATE INDEX idx_suffixes_name ON suffixes(name);