/**
 * Runtime presentation asset catalog used by the Areloria Studio control plane.
 * The catalog stores renderable URIs/metadata only; it is not gameplay truth.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('studio_runtime_assets', {
    id: { type: 'varchar(160)', primaryKey: true },
    kind: { type: 'varchar(40)', notNull: true },
    runtime_uri: { type: 'text', notNull: true },
    content_sha256: { type: 'varchar(64)' },
    source_specification_id: { type: 'varchar(160)' },
    label: { type: 'varchar(255)' },
    metadata: { type: 'jsonb', notNull: true, default: '{}' },
    enabled: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('current_timestamp') },
  });
  pgm.createIndex('studio_runtime_assets', 'kind');
  pgm.createIndex('studio_runtime_assets', 'enabled');
  pgm.createIndex('studio_runtime_assets', 'source_specification_id');
};

export const down = (pgm) => {
  pgm.dropTable('studio_runtime_assets');
};
