/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Create players table
  pgm.createTable('players', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'varchar(255)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    level: { type: 'integer', notNull: true, default: 1 },
    experience: { type: 'integer', notNull: true, default: 0 },
    matrix_energy: { type: 'integer', notNull: true, default: 0 },
    position_x: { type: 'float', notNull: true, default: 0 },
    position_y: { type: 'float', notNull: true, default: 0 },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create world_chunks table for persistence
  pgm.createTable('world_chunks', {
    id: { type: 'varchar(50)', primaryKey: true }, // e.g., "10:-5"
    x: { type: 'integer', notNull: true },
    y: { type: 'integer', notNull: true },
    data: { type: 'jsonb', notNull: true, default: '{}' },
    last_active: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create npc_entities table
  pgm.createTable('npc_entities', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    archetype: { type: 'varchar(100)', notNull: true },
    chunk_id: {
      type: 'varchar(50)',
      references: '"world_chunks"',
      onDelete: 'SET NULL',
    },
    position_x: { type: 'float', notNull: true },
    position_y: { type: 'float', notNull: true },
    memory_data: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for performance
  pgm.createIndex('players', 'username');
  pgm.createIndex('npc_entities', 'chunk_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('npc_entities');
  pgm.dropTable('world_chunks');
  pgm.dropTable('players');
};
