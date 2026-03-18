/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // Asset Specifications Table
  pgm.createTable('asset_specifications', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"players"', onDelete: 'CASCADE' },
    asset_name: { type: 'varchar(255)', notNull: true },
    asset_class: { type: 'varchar(100)', notNull: true },
    style: { type: 'varchar(100)', notNull: true },
    specification: { type: 'jsonb', notNull: true },
    auto_decisions: { type: 'jsonb', notNull: true, default: '[]' },
    version: { type: 'integer', notNull: true, default: 1 },
    is_public: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Asset Variants Table
  pgm.createTable('asset_variants', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    specification_id: { type: 'uuid', notNull: true, references: '"asset_specifications"', onDelete: 'CASCADE' },
    variant_type: { type: 'varchar(50)', notNull: true }, // hero, gameplay, mobileweb
    triangle_count: { type: 'integer' },
    bone_count: { type: 'integer' },
    texture_resolution: { type: 'varchar(50)' },
    variant_data: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Asset Library Table
  pgm.createTable('asset_library', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    specification_id: { type: 'uuid', notNull: true, references: '"asset_specifications"', onDelete: 'CASCADE' },
    asset_name: { type: 'varchar(255)', notNull: true },
    asset_class: { type: 'varchar(100)', notNull: true },
    style: { type: 'varchar(100)', notNull: true },
    tags: { type: 'varchar(255)[]', notNull: true, default: '{}' },
    thumbnail: { type: 'varchar(512)' },
    is_public: { type: 'boolean', notNull: true, default: true },
    downloads: { type: 'integer', notNull: true, default: 0 },
    rating: { type: 'float', notNull: true, default: 0.0 },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Batch Jobs Table
  pgm.createTable('asset_batch_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: '"players"', onDelete: 'CASCADE' },
    job_type: { type: 'varchar(100)', notNull: true },
    status: { type: 'varchar(50)', notNull: true, default: 'pending' },
    input_file: { type: 'varchar(512)' },
    output_file: { type: 'varchar(512)' },
    assets_generated: { type: 'integer', notNull: true, default: 0 },
    errors: { type: 'jsonb', notNull: true, default: '[]' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Indexes
  pgm.createIndex('asset_specifications', 'user_id');
  pgm.createIndex('asset_variants', 'specification_id');
  pgm.createIndex('asset_library', 'asset_class');
  pgm.createIndex('asset_library', 'style');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('asset_batch_jobs');
  pgm.dropTable('asset_library');
  pgm.dropTable('asset_variants');
  pgm.dropTable('asset_specifications');
};
