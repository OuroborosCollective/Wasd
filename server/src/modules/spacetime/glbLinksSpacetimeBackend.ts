import type { GLBLink } from "../asset-registry/GLBRegistry.js";
import { buildSpacetimeSqlUrl, spacetimeWsToHttpBase } from "./spacetimeHttpUrl.js";
import { spacetimeSql } from "./spacetimeSqlClient.js";

const TABLE = "glb_link";

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function rowFromProductValue(row: unknown): GLBLink | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const glbPath = r.glb_path ?? r.glbPath;
  const targetType = r.target_type ?? r.targetType;
  const targetId = r.target_id ?? r.targetId;
  if (typeof glbPath !== "string" || typeof targetType !== "string" || typeof targetId !== "string") {
    return null;
  }
  return { glbPath, targetType: targetType as GLBLink["targetType"], targetId };
}

export class GlbLinksSpacetimeBackend {
  private readonly sqlUrl: string;
  private readonly token?: string;

  constructor(wsUrl: string, moduleName: string, token?: string) {
    const http = spacetimeWsToHttpBase(wsUrl);
    this.sqlUrl = buildSpacetimeSqlUrl(http, moduleName);
    this.token = token;
  }

  async loadAll(): Promise<GLBLink[]> {
    const results = await spacetimeSql(
      this.sqlUrl,
      `SELECT glb_path, target_type, target_id FROM ${TABLE};`,
      this.token
    );
    const out: GLBLink[] = [];
    for (const block of results) {
      const rows = block.rows;
      if (!Array.isArray(rows)) continue;
      for (const raw of rows) {
        const link = rowFromProductValue(raw);
        if (link) out.push(link);
      }
    }
    return out;
  }

  async upsert(link: GLBLink): Promise<void> {
    const sql = [
      `DELETE FROM ${TABLE} WHERE target_type = ${lit(link.targetType)} AND target_id = ${lit(link.targetId)};`,
      `INSERT INTO ${TABLE} (glb_path, target_type, target_id) VALUES (${lit(link.glbPath)}, ${lit(link.targetType)}, ${lit(link.targetId)});`,
    ].join("\n");
    await spacetimeSql(this.sqlUrl, sql, this.token);
  }

  async remove(targetType: string, targetId: string): Promise<void> {
    await spacetimeSql(
      this.sqlUrl,
      `DELETE FROM ${TABLE} WHERE target_type = ${lit(targetType)} AND target_id = ${lit(targetId)};`,
      this.token
    );
  }
}
