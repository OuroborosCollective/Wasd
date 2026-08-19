import { db, isDatabaseConfigured, type Database } from "../../core/Database.js";

export type StudioRuntimeAssetKind =
  | "2d_sprite"
  | "2d_atlas"
  | "3d_glb"
  | "3d_gltf"
  | "texture"
  | "audio"
  | "other";

export interface StudioRuntimeAsset {
  id: string;
  kind: StudioRuntimeAssetKind;
  runtimeUri: string;
  contentSha256: string | null;
  sourceSpecificationId: string | null;
  label: string | null;
  metadata: Record<string, unknown>;
  enabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const SHA256 = /^[a-f0-9]{64}$/i;
const ALLOWED_KINDS = new Set<StudioRuntimeAssetKind>([
  "2d_sprite",
  "2d_atlas",
  "3d_glb",
  "3d_gltf",
  "texture",
  "audio",
  "other",
]);

function normalizeId(value: unknown): string {
  const id = String(value ?? "").trim();
  if (!/^[a-zA-Z0-9._:-]{1,160}$/.test(id)) throw new Error("STUDIO_ASSET_ID_INVALID");
  return id;
}

function normalizeKind(value: unknown): StudioRuntimeAssetKind {
  const kind = String(value ?? "").trim() as StudioRuntimeAssetKind;
  if (!ALLOWED_KINDS.has(kind)) throw new Error("STUDIO_ASSET_KIND_INVALID");
  return kind;
}

function normalizeRuntimeUri(value: unknown): string {
  const uri = String(value ?? "").trim();
  if (!uri || uri.length > 4096) throw new Error("STUDIO_ASSET_RUNTIME_URI_INVALID");
  if (/^(javascript|data):/i.test(uri)) throw new Error("STUDIO_ASSET_RUNTIME_URI_SCHEME_BLOCKED");
  return uri;
}

export class StudioAssetDatabase {
  constructor(private readonly database: Database = db) {}

  isConfigured(): boolean {
    return isDatabaseConfigured();
  }

  async ensureTable(): Promise<void> {
    await this.database.query(`
      CREATE TABLE IF NOT EXISTS studio_runtime_assets (
        id VARCHAR(160) PRIMARY KEY,
        kind VARCHAR(40) NOT NULL,
        runtime_uri TEXT NOT NULL,
        content_sha256 VARCHAR(64),
        source_specification_id VARCHAR(160),
        label VARCHAR(255),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.database.query(`CREATE INDEX IF NOT EXISTS idx_studio_runtime_assets_kind ON studio_runtime_assets(kind)`);
    await this.database.query(`CREATE INDEX IF NOT EXISTS idx_studio_runtime_assets_enabled ON studio_runtime_assets(enabled)`);
  }

  async list(kind?: StudioRuntimeAssetKind, includeDisabled = false): Promise<StudioRuntimeAsset[]> {
    await this.ensureTable();
    const params: any[] = [];
    const conditions: string[] = [];
    if (kind) {
      params.push(normalizeKind(kind));
      conditions.push(`kind = $${params.length}`);
    }
    if (!includeDisabled) conditions.push("enabled = TRUE");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.database.query(
      `SELECT * FROM studio_runtime_assets ${where} ORDER BY kind ASC, id ASC`,
      params
    );
    return result.rows.map((row: any) => this.map(row));
  }

  async get(id: string): Promise<StudioRuntimeAsset | null> {
    await this.ensureTable();
    const result = await this.database.query(
      `SELECT * FROM studio_runtime_assets WHERE id = $1`,
      [normalizeId(id)]
    );
    return result.rows[0] ? this.map(result.rows[0]) : null;
  }

  async upsert(input: {
    id: string;
    kind: StudioRuntimeAssetKind;
    runtimeUri: string;
    contentSha256?: string | null;
    sourceSpecificationId?: string | null;
    label?: string | null;
    metadata?: Record<string, unknown>;
    enabled?: boolean;
  }): Promise<StudioRuntimeAsset> {
    await this.ensureTable();
    const id = normalizeId(input.id);
    const kind = normalizeKind(input.kind);
    const runtimeUri = normalizeRuntimeUri(input.runtimeUri);
    const digest = input.contentSha256?.trim() || null;
    if (digest && !SHA256.test(digest)) throw new Error("STUDIO_ASSET_SHA256_INVALID");
    const sourceSpecificationId = input.sourceSpecificationId?.trim() || null;
    const label = input.label?.trim() || null;
    const metadata = input.metadata ?? {};
    const enabled = input.enabled ?? true;

    const result = await this.database.query(
      `INSERT INTO studio_runtime_assets (
        id, kind, runtime_uri, content_sha256, source_specification_id, label, metadata, enabled
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
      ON CONFLICT (id) DO UPDATE SET
        kind = EXCLUDED.kind,
        runtime_uri = EXCLUDED.runtime_uri,
        content_sha256 = EXCLUDED.content_sha256,
        source_specification_id = EXCLUDED.source_specification_id,
        label = EXCLUDED.label,
        metadata = EXCLUDED.metadata,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
      RETURNING *`,
      [id, kind, runtimeUri, digest, sourceSpecificationId, label, JSON.stringify(metadata), enabled]
    );
    return this.map(result.rows[0]);
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureTable();
    const result = await this.database.query(
      `DELETE FROM studio_runtime_assets WHERE id = $1 RETURNING id`,
      [normalizeId(id)]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async health(): Promise<{ configured: boolean; reachable: boolean; rowCount: number | null }> {
    if (!this.isConfigured()) return { configured: false, reachable: false, rowCount: null };
    try {
      await this.ensureTable();
      const result = await this.database.query(`SELECT COUNT(*)::int AS count FROM studio_runtime_assets`);
      return { configured: true, reachable: true, rowCount: Number(result.rows[0]?.count ?? 0) };
    } catch {
      return { configured: true, reachable: false, rowCount: null };
    }
  }

  private map(row: any): StudioRuntimeAsset {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    return {
      id: String(row.id),
      kind: normalizeKind(row.kind),
      runtimeUri: String(row.runtime_uri),
      contentSha256: row.content_sha256 ? String(row.content_sha256) : null,
      sourceSpecificationId: row.source_specification_id ? String(row.source_specification_id) : null,
      label: row.label ? String(row.label) : null,
      metadata,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
