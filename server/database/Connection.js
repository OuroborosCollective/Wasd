'use strict';

const pg = require('pg');

const { Pool } = pg;

function envTrim(key) {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function resolveConnectionString() {
  const direct = envTrim('DATABASE_URL') || envTrim('SUPABASE_DB_URL');
  if (direct) return direct;

  const host = envTrim('PGHOST') || envTrim('POSTGRES_HOST');
  const poolerTxnPort = envTrim('POOLER_PROXY_PORT_TRANSACTION');
  const explicitPort = envTrim('PGPORT') || envTrim('POSTGRES_PORT');
  const looksLikeDockerDb = host === 'db' || host === 'localhost' || host === '127.0.0.1';
  const port =
    explicitPort ||
    (!looksLikeDockerDb && poolerTxnPort ? poolerTxnPort : '') ||
    '5432';
  const database = envTrim('PGDATABASE') || envTrim('POSTGRES_DB') || 'postgres';
  const user = envTrim('PGUSER') || envTrim('POSTGRES_USER') || 'postgres';
  const password = envTrim('PGPASSWORD') || envTrim('POSTGRES_PASSWORD');

  if (!host || !password) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

function resolveSslMode() {
  const sslEnv = envTrim('PGSSL').toLowerCase();
  const pgSslMode = envTrim('PGSSLMODE').toLowerCase();
  const disableSsl =
    envTrim('DATABASE_SSL_DISABLED') === '1' ||
    pgSslMode === 'disable' ||
    pgSslMode === 'allow';

  if (disableSsl) return false;
  if (sslEnv === '1' || sslEnv === 'true' || sslEnv === 'yes' || sslEnv === 'require') {
    return { rejectUnauthorized: false };
  }
  if (sslEnv === '0' || sslEnv === 'false' || sslEnv === 'no' || sslEnv === 'disable') {
    return false;
  }

  const host = envTrim('PGHOST') || envTrim('POSTGRES_HOST');
  const looksLocal =
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === 'db' ||
    host.endsWith('.internal');

  return looksLocal ? false : { rejectUnauthorized: false };
}

function normalizeSqlPlaceholders(sql) {
  let index = 0;
  return String(sql).replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

const connectionString = resolveConnectionString();
const pool = new Pool({
  connectionString,
  ssl: resolveSslMode()
});

class PgTransactionConnection {
  constructor(client) {
    this.client = client;
    this.released = false;
  }

  async beginTransaction() {
    await this.client.query('BEGIN');
  }

  async commit() {
    await this.client.query('COMMIT');
  }

  async rollback() {
    await this.client.query('ROLLBACK');
  }

  async query(sql, params = []) {
    const text = normalizeSqlPlaceholders(sql);
    const result = await this.client.query(text, params);

    if (/^\s*select\b/i.test(String(sql))) {
      return result.rows;
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      affectedRows: result.rowCount,
      command: result.command
    };
  }

  async execute(sql, params = []) {
    return this.query(sql, params);
  }

  release() {
    if (!this.released) {
      this.released = true;
      this.client.release();
    }
  }
}

class DatabaseConnectionFacade {
  static get pool() {
    return pool;
  }

  static isConfigured() {
    return Boolean(connectionString);
  }

  static async getConnection() {
    const client = await pool.connect();
    return new PgTransactionConnection(client);
  }

  static async query(sql, params = []) {
    const text = normalizeSqlPlaceholders(sql);
    const result = await pool.query(text, params);

    if (/^\s*select\b/i.test(String(sql))) {
      return result.rows;
    }

    return {
      rows: result.rows,
      rowCount: result.rowCount,
      affectedRows: result.rowCount,
      command: result.command
    };
  }

  static async testConnection() {
    try {
      const result = await pool.query('SELECT 1 AS ok');
      return Number(result.rows?.[0]?.ok) === 1;
    } catch (error) {
      console.error('[database/Connection] testConnection failed:', error);
      return false;
    }
  }

  static async close() {
    await pool.end();
  }
}

module.exports = {
  Database: DatabaseConnectionFacade,
  default: DatabaseConnectionFacade
};
