import { canonicalize } from "./WorldHashSnapshot.js";

export interface CityLayoutEntity {
  id?: string;
  type?: string;
  role?: string;
  position?: { x?: number; y?: number; z?: number };
  state?: string;
  [key: string]: unknown;
}

export interface CityLayoutFix {
  entityId: string;
  reason: string;
  before: unknown;
  after: unknown;
}

export interface CityLayoutCompileResult {
  ok: boolean;
  sector: number;
  fixes: CityLayoutFix[];
  entities: CityLayoutEntity[];
}

function sectorOf(entity: CityLayoutEntity): number {
  const x = Number(entity.position?.x ?? 0);
  const y = Number(entity.position?.y ?? 0);
  return Math.abs((Math.floor(x / 64) * 31 + Math.floor(y / 64) * 17) % 64);
}

function isBuilding(entity: CityLayoutEntity): boolean {
  return /house|building|hall|forge|wall|gate|road/i.test(String(entity.type ?? entity.role ?? entity.id ?? ""));
}

function isRoad(entity: CityLayoutEntity): boolean {
  return /road|path|street/i.test(String(entity.type ?? entity.role ?? entity.id ?? ""));
}

function distance(a: CityLayoutEntity, b: CityLayoutEntity): number {
  const ax = Number(a.position?.x ?? 0);
  const ay = Number(a.position?.y ?? 0);
  const bx = Number(b.position?.x ?? 0);
  const by = Number(b.position?.y ?? 0);
  return Math.hypot(ax - bx, ay - by);
}

export class CityLayoutCompiler {
  compileSector(entities: CityLayoutEntity[], sector: number): CityLayoutCompileResult {
    const scoped = entities.filter((entity) => sectorOf(entity) === sector && isBuilding(entity)).map((entity) => canonicalize(entity) as CityLayoutEntity);
    const fixes: CityLayoutFix[] = [];
    const roads = scoped.filter(isRoad);

    for (let i = 0; i < scoped.length; i++) {
      const current = scoped[i];
      if (!current.position) current.position = { x: sector * 64, y: 0, z: 0 };
      const before = canonicalize(current);

      for (let j = 0; j < i; j++) {
        const other = scoped[j];
        if (isRoad(current) || isRoad(other)) continue;
        if (distance(current, other) < 2) {
          current.position = {
            x: Number(current.position?.x ?? 0) + 2 + (i % 3),
            y: Number(current.position?.y ?? 0) + 2 + (i % 5),
            z: Number(current.position?.z ?? 0),
          };
        }
      }

      if (!isRoad(current) && roads.length === 0) {
        current.state = "needs_road_anchor";
      }

      const after = canonicalize(current);
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        fixes.push({
          entityId: String(current.id ?? `entity:${i}`),
          reason: roads.length === 0 ? "city_layout_missing_road_or_spacing" : "city_layout_spacing",
          before,
          after,
        });
      }
    }

    return { ok: fixes.length === 0, sector, fixes, entities: scoped };
  }
}

export const cityLayoutCompiler = new CityLayoutCompiler();
