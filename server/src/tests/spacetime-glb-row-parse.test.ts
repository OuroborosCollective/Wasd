import { describe, it, expect } from "vitest";
import { parseGlbLinkRow, extractSqlColumnNames, unwrapSatsCell } from "../modules/spacetime/spacetimeGlbRowParse.js";

describe("unwrapSatsCell", () => {
  it("unwraps single numeric-key SumValue wrapper", () => {
    expect(unwrapSatsCell({ "0": "/m.glb" })).toBe("/m.glb");
  });
});

describe("extractSqlColumnNames", () => {
  it("reads ProductType element names", () => {
    const schema = {
      Product: {
        elements: [
          { name: { some: "id" }, algebraic_type: { Builtin: { U64: [] } } },
          { name: { some: "glb_path" }, algebraic_type: { Builtin: { String: [] } } },
          { name: { some: "target_type" }, algebraic_type: { Builtin: { String: [] } } },
          { name: { some: "target_id" }, algebraic_type: { Builtin: { String: [] } } },
        ],
      },
    };
    expect(extractSqlColumnNames(schema)).toEqual(["id", "glb_path", "target_type", "target_id"]);
  });
});

describe("parseGlbLinkRow", () => {
  it("parses SATS array row with id column (4 cells)", () => {
    const link = parseGlbLinkRow(
      [1, "/assets/models/a.glb", "npc_single", "npc_1"],
      ["id", "glb_path", "target_type", "target_id"]
    );
    expect(link).toEqual({
      glbPath: "/assets/models/a.glb",
      targetType: "npc_single",
      targetId: "npc_1",
    });
  });

  it("parses 3-cell row without id", () => {
    const link = parseGlbLinkRow(["/b.glb", "object_group", "tree"], undefined);
    expect(link?.glbPath).toBe("/b.glb");
    expect(link?.targetType).toBe("object_group");
    expect(link?.targetId).toBe("tree");
  });

  it("parses object-shaped row", () => {
    const link = parseGlbLinkRow(
      { glb_path: "/c.glb", target_type: "npc_group", target_id: "merchant" },
      undefined
    );
    expect(link).toEqual({
      glbPath: "/c.glb",
      targetType: "npc_group",
      targetId: "merchant",
    });
  });

  it("rejects invalid target type", () => {
    expect(parseGlbLinkRow(["/x.glb", "bogus", "id"], undefined)).toBeNull();
  });
});
