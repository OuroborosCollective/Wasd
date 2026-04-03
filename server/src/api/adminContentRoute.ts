import { Router, type Response } from "express";
import express from "express";
import type { WorldTick } from "../core/WorldTick.js";
import type { GLBLink } from "../modules/asset-registry/GLBRegistry.js";
import { adminAuthMiddleware, adminWriteBlocked, type AdminRequest } from "../middleware/adminAuthMiddleware.js";
import { getContentDataSourceLabel } from "../modules/content/contentDataRoot.js";

const TARGET_TYPES = new Set<string>([
  "monster_group",
  "npc_group",
  "npc_single",
  "object_group",
  "object_single",
]);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parsePoolEntry(body: unknown): string | string[] | null {
  if (typeof body === "string") {
    const t = body.trim();
    return t.length ? t : null;
  }
  if (Array.isArray(body)) {
    const arr = body.map((x) => String(x).trim()).filter((x) => x.length > 0);
    if (arr.length === 0) return null;
    return arr.length === 1 ? arr[0]! : arr;
  }
  return null;
}

export function adminContentRouter(tick: WorldTick): Router {
  const router = Router();
  router.use(express.json({ limit: "512kb" }));

  router.get("/meta", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    const content = getContentDataSourceLabel();
    const stats = tick.getPersistenceStats();
    res.json({
      glbLinksStore: stats.glbLinksStore,
      contentRoot: content.root,
      contentMode: content.mode,
      readOnly: process.env.CONTENT_ADMIN_READONLY?.trim() === "1",
    });
  });

  router.get("/glb-links", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({ links: tick.glbRegistry.getLinks() });
  });

  router.get("/glb-scan", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({ models: tick.glbRegistry.scanModels() });
  });

  router.post("/glb-links", adminAuthMiddleware, adminWriteBlocked, async (req: AdminRequest, res: Response) => {
    const b = req.body as Partial<GLBLink>;
    if (!isNonEmptyString(b.glbPath) || !isNonEmptyString(b.targetType) || !isNonEmptyString(b.targetId)) {
      return res.status(400).json({ error: "glbPath, targetType, targetId required" });
    }
    if (!TARGET_TYPES.has(b.targetType.trim())) {
      return res.status(400).json({ error: "invalid targetType", allowed: [...TARGET_TYPES] });
    }
    try {
      await tick.glbRegistry.addLink({
        glbPath: b.glbPath.trim(),
        targetType: b.targetType.trim() as GLBLink["targetType"],
        targetId: b.targetId.trim(),
      });
      res.json({ ok: true, links: tick.glbRegistry.getLinks() });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  router.delete("/glb-links", adminAuthMiddleware, adminWriteBlocked, async (req: AdminRequest, res: Response) => {
    const q = req.query as { targetType?: string; targetId?: string };
    if (!isNonEmptyString(q.targetType) || !isNonEmptyString(q.targetId)) {
      return res.status(400).json({ error: "query targetType and targetId required" });
    }
    if (!TARGET_TYPES.has(q.targetType.trim())) {
      return res.status(400).json({ error: "invalid targetType" });
    }
    try {
      await tick.glbRegistry.removeLink(q.targetType.trim(), q.targetId.trim());
      res.json({ ok: true, links: tick.glbRegistry.getLinks() });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  router.get("/asset-pools", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json(tick.assetPoolResolver.getDocument());
  });

  router.post("/asset-pools/entry", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const { category, key, path, paths } = req.body as {
      category?: string;
      key?: string;
      path?: string;
      paths?: string[];
    };
    if (!isNonEmptyString(category) || !isNonEmptyString(key)) {
      return res.status(400).json({ error: "category and key required" });
    }
    const entry = paths !== undefined ? parsePoolEntry(paths) : path !== undefined ? parsePoolEntry(path) : null;
    if (!entry) {
      return res.status(400).json({ error: "path (string) or paths (string[]) required" });
    }
    const ok = tick.assetPoolResolver.setEntry(category.trim(), key.trim(), entry);
    if (!ok) {
      return res.status(400).json({ error: "invalid category, key, or path values" });
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.delete("/asset-pools/entry", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const q = req.query as { category?: string; key?: string };
    if (!isNonEmptyString(q.category) || !isNonEmptyString(q.key)) {
      return res.status(400).json({ error: "query category and key required" });
    }
    const ok = tick.assetPoolResolver.removeEntry(q.category, q.key);
    if (!ok) {
      return res.status(404).json({ error: "entry not found" });
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.post("/asset-pools/default", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const { category, path, paths } = req.body as { category?: string; path?: string; paths?: string[] };
    if (!isNonEmptyString(category)) {
      return res.status(400).json({ error: "category required" });
    }
    const entry = paths !== undefined ? parsePoolEntry(paths) : path !== undefined ? parsePoolEntry(path) : null;
    if (!entry) {
      return res.status(400).json({ error: "path or paths required" });
    }
    const ok = tick.assetPoolResolver.setDefault(category.trim(), entry);
    if (!ok) {
      return res.status(400).json({ error: "invalid category or path values" });
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.delete("/asset-pools/default", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const q = req.query as { category?: string };
    if (!isNonEmptyString(q.category)) {
      return res.status(400).json({ error: "query category required" });
    }
    const ok = tick.assetPoolResolver.removeDefault(q.category);
    if (!ok) {
      return res.status(404).json({ error: "default not found" });
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.post("/asset-pools/reload", adminAuthMiddleware, (req: AdminRequest, res: Response) => {
    tick.assetPoolResolver.reload();
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  return router;
}
