import type { GLBLink } from "../asset-registry/GLBRegistry.js";

const VALID_TARGET_TYPES = new Set<string>([
  "monster_group",
  "npc_group",
  "npc_single",
  "object_group",
  "object_single",
]);

/**
 * Spacetime HTTP SQL returns rows as SATS-JSON: often an array per row (column order),
 * not a plain object. Unwrap single-variant SumValue objects if present.
 */
export function unwrapSatsCell(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v !== "object" || Array.isArray(v)) return v;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o);
  if (keys.length !== 1) return v;
  const k = keys[0];
  if (!/^\d+$/.test(k)) return v;
  return unwrapSatsCell(o[k]);
}

function asStringCell(v: unknown): string | null {
  const u = unwrapSatsCell(v);
  if (typeof u === "string") return u;
  if (typeof u === "number" && Number.isFinite(u)) return String(u);
  return null;
}

/** Parse ProductType.schema from SQL statement result for column names (snake_case). */
export function extractSqlColumnNames(schema: unknown): string[] | undefined {
  if (!schema || typeof schema !== "object") return undefined;
  const o = schema as Record<string, unknown>;
  const product = o.Product as Record<string, unknown> | undefined;
  if (!product?.elements || !Array.isArray(product.elements)) return undefined;
  const names: string[] = [];
  for (const el of product.elements) {
    if (!el || typeof el !== "object") {
      names.push("");
      continue;
    }
    const e = el as Record<string, unknown>;
    const nm = e.name as Record<string, unknown> | string | undefined;
    if (nm && typeof nm === "object" && "some" in nm && typeof (nm as { some?: unknown }).some === "string") {
      names.push((nm as { some: string }).some);
    } else if (typeof nm === "string") {
      names.push(nm);
    } else {
      names.push("");
    }
  }
  return names.length ? names : undefined;
}

/**
 * Parse one row from Spacetime SQL SELECT for glb_link-style data.
 */
export function parseGlbLinkRow(raw: unknown, columnNames?: string[]): GLBLink | null {
  if (raw == null) return null;

  if (Array.isArray(raw)) {
    const idx = (name: string) => columnNames?.indexOf(name) ?? -1;
    let glbPath: string | null = null;
    let targetType: string | null = null;
    let targetId: string | null = null;

    const ig = idx("glb_path");
    const it = idx("target_type");
    const ii = idx("target_id");
    if (ig >= 0 && it >= 0 && ii >= 0) {
      glbPath = asStringCell(raw[ig]);
      targetType = asStringCell(raw[it]);
      targetId = asStringCell(raw[ii]);
    }

    if (!glbPath || !targetType || !targetId) {
      if (raw.length >= 4) {
        glbPath = asStringCell(raw[1]) ?? glbPath;
        targetType = asStringCell(raw[2]) ?? targetType;
        targetId = asStringCell(raw[3]) ?? targetId;
      }
    }
    if (!glbPath || !targetType || !targetId) {
      if (raw.length >= 3) {
        glbPath = asStringCell(raw[0]) ?? glbPath;
        targetType = asStringCell(raw[1]) ?? targetType;
        targetId = asStringCell(raw[2]) ?? targetId;
      }
    }

    if (!glbPath || !targetType || !targetId) return null;
    if (!VALID_TARGET_TYPES.has(targetType)) return null;
    return { glbPath, targetType: targetType as GLBLink["targetType"], targetId };
  }

  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const glbPath = asStringCell(r.glb_path ?? r.glbPath);
    const targetType = asStringCell(r.target_type ?? r.targetType);
    const targetId = asStringCell(r.target_id ?? r.targetId);
    if (!glbPath || !targetType || !targetId) return null;
    if (!VALID_TARGET_TYPES.has(targetType)) return null;
    return { glbPath, targetType: targetType as GLBLink["targetType"], targetId };
  }

  return null;
}
