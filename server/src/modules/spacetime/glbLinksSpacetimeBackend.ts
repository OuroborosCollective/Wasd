import type { GLBLink } from "../asset-registry/GLBRegistry.js";
import { buildSpacetimeSqlUrl, spacetimeWsToHttpBase } from "./spacetimeHttpUrl.js";
import { extractSqlColumnNames, parseGlbLinkRow } from "./spacetimeGlbRowParse.js";
import { spacetimeSql } from "./spacetimeSqlClient.js";

const TABLE = "glb_link";

function lit(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
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
      const colNames = extractSqlColumnNames(block.schema);
      for (const raw of rows) {
        const link = parseGlbLinkRow(raw, colNames);
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
