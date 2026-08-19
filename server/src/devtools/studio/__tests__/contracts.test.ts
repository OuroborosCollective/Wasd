import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { StudioGameDataStore } from "../StudioGameDataStore.js";

const store = new StudioGameDataStore();

function readRepo(relativePath: string): string {
  return readFileSync(path.join(store.repoRoot, relativePath), "utf8");
}

describe("Areloria Studio control-plane contracts", () => {
  it("blocks path traversal outside game-data", async () => {
    await expect(store.readJson("../package.json")).rejects.toThrow(/PATH_TRAVERSAL/);
  });

  it("publishes presentation bindings without gameplay-authority fields", async () => {
    const document = await store.readJson("visual/presentation_bindings.json");
    const raw = JSON.stringify(document.value).toLowerCase();
    expect(raw).not.toContain('"worldhash"');
    expect(raw).not.toContain('"canonicalintent"');
    expect(raw).not.toContain('"tickid"');
    expect((document.value as any).schemaVersion).toBe("areloria.presentation-bindings.v1");
  });

  it("defines independent active 2d and 3d render profiles", async () => {
    const document = await store.readJson("visual/render_profiles.json");
    const value = document.value as any;
    expect(value.schemaVersion).toBe("areloria.render-profiles.v1");
    expect(value.active.client2d).toBeTruthy();
    expect(value.active.client3d).toBeTruthy();
    expect(value.profiles[value.active.client2d].client2d).toBeTruthy();
    expect(value.profiles[value.active.client3d].client3d).toBeTruthy();
  });

  it("registers typed studio MCP tools on the existing MCP server", () => {
    const base = readRepo("server/src/devtools/studio/registerStudioMcpTools.ts");
    const extended = readRepo("server/src/devtools/studio/registerStudioExtendedMcpTools.ts");
    for (const tool of [
      "studio_list_domains",
      "studio_write_json",
      "studio_runtime_asset_upsert",
      "studio_activate_database_asset",
      "studio_presentation_set_binding",
      "studio_render_profile_activate",
      "studio_live_glb_link_set",
      "studio_live_world_place",
      "studio_runtime_readback",
    ]) expect(base).toContain(`\"${tool}\"`);
    for (const tool of [
      "studio_repo_read",
      "studio_repo_write_text",
      "studio_repo_replace_text",
      "studio_live_world_batch_place",
      "studio_live_world_batch_remove",
      "studio_live_asset_pool_set_default",
      "studio_live_content_preview",
    ]) expect(extended).toContain(`\"${tool}\"`);
  });

  it("keeps the 2d default renderer on live authoritative projection instead of Future demo truth", () => {
    const bridge = readRepo("apps/client-2d/src/DeterministicWorldIsoAppHudBridge.tsx");
    expect(bridge).toContain("LiveAuthoritativeWorld2D");
    expect(bridge).not.toContain("DeterministicWorldIsoAppFuture");
    expect(bridge).not.toContain('playerName="Architect"');
  });

  it("keeps the 2d authoritative renderer free of local gameplay movement and generated world plans", () => {
    const source = readRepo("apps/client-2d/src/LiveAuthoritativeWorld2D.tsx");
    expect(source).toContain("WORLD_HEARTBEAT");
    expect(source).not.toContain("generateChunkScenePlan");
    expect(source).not.toContain("__wasd2dMove");
    expect(source).not.toContain("sendPlayerAction");
  });

  it("wraps Babylon with presentation-only model substitution", () => {
    const source = readRepo("client/src/engine/presentation/StudioPresentationEngineBridge.ts");
    expect(source).toContain("resolveStudio3DModelUrl");
    expect(source).not.toContain("worldHash");
    expect(source).not.toContain("root.position");
    expect(source).not.toContain("canonicalIntent");
  });

  it("stores database runtime assets separately from gameplay truth", () => {
    const migration = readRepo("server/migrations/1787110800000_add-studio-runtime-assets.js");
    expect(migration).toContain("studio_runtime_assets");
    expect(migration).toContain("runtime_uri");
    expect(migration).not.toContain("world_hash");
    expect(migration).not.toContain("tick_id");
  });

  it("serves presentation config publicly while mutation MCP remains token-gated", () => {
    const route = readRepo("server/src/api/mcpRoute.ts");
    const publicIndex = route.indexOf('router.get("/presentation-config"');
    const authIndex = route.indexOf("// All MCP/admin mutation surfaces below are fail-closed behind the MCP owner token.");
    expect(publicIndex).toBeGreaterThan(0);
    expect(authIndex).toBeGreaterThan(publicIndex);
    expect(route).toContain("MCP_ADMIN_TOKEN");
    expect(route).toContain("registerStudioExtendedMcpTools");
  });
});
