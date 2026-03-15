import { describe, it, expect, beforeEach } from "vitest";
import { GLBRegistry, GLBLink } from "../modules/asset-registry/GLBRegistry.js";

describe("GLBRegistry", () => {
  let registry: GLBRegistry;

  beforeEach(() => {
    registry = new GLBRegistry();
  });

  it("should add a link and retrieve it", () => {
    const testLink: GLBLink = {
      glbPath: "/assets/models/test.glb",
      targetType: "npc_single",
      targetId: "test_npc"
    };
    registry.addLink(testLink);

    expect(registry.getModelForTarget("npc_single", "test_npc")).toBe("/assets/models/test.glb");
  });

  it("should update an existing link", () => {
    const initialLink: GLBLink = {
      glbPath: "/assets/models/test.glb",
      targetType: "npc_single",
      targetId: "test_npc"
    };
    registry.addLink(initialLink);

    const updatedLink: GLBLink = {
      glbPath: "/assets/models/test_updated.glb",
      targetType: "npc_single",
      targetId: "test_npc"
    };
    registry.addLink(updatedLink);

    expect(registry.getModelForTarget("npc_single", "test_npc")).toBe("/assets/models/test_updated.glb");
  });

  it("should remove a link", () => {
    const testLink: GLBLink = {
      glbPath: "/assets/models/test.glb",
      targetType: "npc_single",
      targetId: "test_npc"
    };
    registry.addLink(testLink);
    registry.removeLink("npc_single", "test_npc");

    expect(registry.getModelForTarget("npc_single", "test_npc")).toBeNull();
  });

  it("should return null for non-existent target", () => {
    expect(registry.getModelForTarget("npc_single", "non_existent")).toBeNull();
  });
});
