import fs from "node:fs";
import path from "node:path";
import { Router, type Response } from "express";
import express from "express";
import multer from "multer";
import type { WorldTick } from "../core/WorldTick.js";
import type { GLBLink } from "../modules/asset-registry/GLBRegistry.js";
import { adminAuthMiddleware, adminWriteBlocked, type AdminRequest } from "../middleware/adminAuthMiddleware.js";
import { getContentDataSourceLabel } from "../modules/content/contentDataRoot.js";
import {
  loadMonsterGroupKeysForAdmin,
  loadNpcChoicesForAdmin,
  loadNpcRoleChoicesForAdmin,
  loadObjectTypeChoicesForAdmin,
  loadWorldObjectChoicesForAdmin,
} from "../modules/content/adminContentChoices.js";
import { getServerPublicModelsDir, validateAdminGlbPathForServer } from "../modules/content/adminGlbPathCheck.js";
import {
  scanGlbGalleryTree,
  sanitizeAdminGlbFilename,
  sanitizeAdminGlbRelativeFolder,
} from "../modules/content/adminGlbGallery.js";
import { publishContentPackFromRepo } from "../modules/content/publishContentPackFromRepo.js";
import { validateContentRoot } from "../modules/content/validateContentCore.js";
import { getContentDataRoot } from "../modules/content/contentDataRoot.js";

const MAX_ADMIN_GLB_MB = Math.min(
  120,
  Math.max(1, parseInt(process.env.MAX_ADMIN_GLB_UPLOAD_MB || process.env.MAX_GLB_SIZE_MB || "50", 10) || 50)
);

const adminGlbUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ADMIN_GLB_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".glb" || ext === ".gltf") cb(null, true);
    else cb(new Error("Nur .glb oder .gltf."));
  },
});

const TARGET_TYPES = new Set<string>([
  "monster_group",
  "npc_group",
  "npc_single",
  "object_group",
  "object_single",
]);

/** Rough German hints for validateContent errors (admin UI). */
function mapValidationErrorToDe(en: string): string {
  if (en.includes("Duplicate")) return "Doppelte ID: " + en.replace(/^Duplicate \w+ ID: /, "");
  if (en.includes("references missing dialogue"))
    return "NPC verweist auf fehlenden Dialog: " + en.replace(/^NPC (\S+) references missing dialogue (\S+)$/, "$1 → $2");
  if (en.includes("references missing NPC")) return "Quest/NPC-Verweis fehlt: " + en;
  if (en.includes("references missing item")) return "Item-Verweis fehlt: " + en;
  if (en.includes("Spawn references missing NPC")) return "Spawn verweist auf unbekannten NPC: " + en.replace(/^Spawn references missing NPC (\S+)$/, "$1");
  if (en.includes("dropTable")) return "NPC-Beute-Tabelle: " + en;
  if (en.includes("Dialogue") && en.includes("node")) return "Dialog: " + en;
  if (en.includes("unreachable node")) return "Dialog: unerreichbarer Knoten — " + en;
  if (en.includes("Missing file:")) return "Datei fehlt: " + en.replace(/^Missing file: /, "");
  if (en.includes("Invalid JSON")) return "Datei ist kein gültiges JSON: " + en;
  return en;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function jsonError(res: Response, status: number, errorDe: string, error?: string) {
  res.status(status).json({ error: error ?? errorDe, errorDe });
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

  router.get("/choices", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({
      npcs: loadNpcChoicesForAdmin(),
      worldObjects: loadWorldObjectChoicesForAdmin(),
      monsterGroups: loadMonsterGroupKeysForAdmin(),
      npcRoles: loadNpcRoleChoicesForAdmin(),
      objectTypes: loadObjectTypeChoicesForAdmin(),
    });
  });

  router.post("/validate-preview", adminAuthMiddleware, (req: AdminRequest, res: Response) => {
    const root = getContentDataRoot();
    const v = validateContentRoot(root);
    const glbPath = typeof req.body?.glbPath === "string" ? req.body.glbPath.trim() : "";
    const pathHint = glbPath ? validateAdminGlbPathForServer(glbPath) : null;
    res.json({
      contentOk: v.ok,
      contentErrorsDe: v.errors.map((e) => mapValidationErrorToDe(e)),
      glbPathOk: pathHint === null,
      glbPathMessageDe: pathHint,
    });
  });

  router.post("/publish-pack", adminAuthMiddleware, adminWriteBlocked, (_req: AdminRequest, res: Response) => {
    const result = publishContentPackFromRepo();
    if (!result.ok) {
      if (result.code === "validation_failed") {
        const errorsDe = result.errors?.map((e) => mapValidationErrorToDe(e)) ?? [];
        const detail = errorsDe.slice(0, 12).join("\n");
        return res.status(400).json({
          error: result.message,
          errorDe: detail ? result.message + "\n" + detail : result.message,
          errors: result.errors,
          errorsDe,
        });
      }
      return res.status(400).json({ error: result.message, errorDe: result.message });
    }
    res.json({ ok: true, dest: result.dest, messageDe: result.message });
  });

  router.get("/glb-links", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({ links: tick.glbRegistry.getLinks() });
  });

  router.get("/glb-scan", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    res.json({ models: tick.glbRegistry.scanModels() });
  });

  router.get("/glb-gallery-tree", adminAuthMiddleware, (_req: AdminRequest, res: Response) => {
    const { modelsRoot, items } = scanGlbGalleryTree();
    res.json({ modelsRoot, items, maxUploadMb: MAX_ADMIN_GLB_MB });
  });

  router.post(
    "/glb-upload",
    adminAuthMiddleware,
    adminWriteBlocked,
    (req: AdminRequest, res: Response, next: express.NextFunction) => {
      adminGlbUploadMulter.single("file")(req, res, (err: unknown) => {
        if (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("too large") || (err as { code?: string })?.code === "LIMIT_FILE_SIZE") {
            return jsonError(res, 413, `Datei zu groß (max. ${MAX_ADMIN_GLB_MB} MB).`, "file too large");
          }
          return jsonError(res, 400, msg.includes("Nur .glb") ? msg : "Upload fehlgeschlagen: " + msg, msg);
        }
        next();
      });
    },
    (req: AdminRequest, res: Response) => {
      const file = req.file;
      if (!file?.buffer?.length) {
        return jsonError(res, 400, "Keine Datei empfangen (Formular-Feld: file).", "file required");
      }
      const folderSan = sanitizeAdminGlbRelativeFolder((req.body as { folder?: unknown })?.folder);
      if (!folderSan.ok) {
        return jsonError(res, 400, folderSan.errorDe, folderSan.errorDe);
      }
      const nameSan = sanitizeAdminGlbFilename(file.originalname);
      if (!nameSan.ok) {
        return jsonError(res, 400, nameSan.errorDe, nameSan.errorDe);
      }
      const modelsRoot = getServerPublicModelsDir();
      const relPath = folderSan.folder ? path.join(folderSan.folder, nameSan.filename) : nameSan.filename;
      const absPath = path.resolve(path.join(modelsRoot, relPath));
      const relCheck = path.relative(path.resolve(modelsRoot), absPath);
      if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) {
        return jsonError(res, 400, "Ungültiger Zielpfad.", "path traversal");
      }
      try {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, file.buffer);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        return res.status(500).json({ error: m, errorDe: "Speichern auf dem Server fehlgeschlagen." });
      }
      const urlPath = "/assets/models/" + relPath.replace(/\\/g, "/");
      res.json({
        ok: true,
        url: urlPath,
        relativePath: relPath.replace(/\\/g, "/"),
        maxUploadMb: MAX_ADMIN_GLB_MB,
      });
    }
  );

  router.post("/glb-links", adminAuthMiddleware, adminWriteBlocked, async (req: AdminRequest, res: Response) => {
    const b = req.body as Partial<GLBLink>;
    if (!isNonEmptyString(b.glbPath) || !isNonEmptyString(b.targetType) || !isNonEmptyString(b.targetId)) {
      return jsonError(
        res,
        400,
        "Bitte Modell-Pfad, Ziel-Art und Ziel-ID ausfüllen.",
        "glbPath, targetType, targetId required"
      );
    }
    if (!TARGET_TYPES.has(b.targetType.trim())) {
      return jsonError(res, 400, "Unbekannte Ziel-Art (targetType).", "invalid targetType");
    }
    const pathErr = validateAdminGlbPathForServer(b.glbPath.trim());
    if (pathErr) {
      return jsonError(res, 400, pathErr, pathErr);
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
      return jsonError(res, 400, "Ziel-Art und Ziel-ID zum Löschen angeben.", "query targetType and targetId required");
    }
    if (!TARGET_TYPES.has(q.targetType.trim())) {
      return jsonError(res, 400, "Unbekannte Ziel-Art.", "invalid targetType");
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
      return jsonError(res, 400, "Bereich (category) und Schlüssel (key) angeben.", "category and key required");
    }
    const entry = paths !== undefined ? parsePoolEntry(paths) : path !== undefined ? parsePoolEntry(path) : null;
    if (!entry) {
      return jsonError(res, 400, "Mindestens einen Modell-Pfad angeben.", "path or paths required");
    }
    const pathsToCheck = typeof entry === "string" ? [entry] : entry;
    for (const gp of pathsToCheck) {
      const pe = validateAdminGlbPathForServer(gp);
      if (pe) return jsonError(res, 400, pe, pe);
    }
    const ok = tick.assetPoolResolver.setEntry(category.trim(), key.trim(), entry);
    if (!ok) {
      return jsonError(res, 400, "Ungültige Eingabe (Bereich, Schlüssel oder Pfad).", "invalid category, key, or path values");
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.delete("/asset-pools/entry", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const q = req.query as { category?: string; key?: string };
    if (!isNonEmptyString(q.category) || !isNonEmptyString(q.key)) {
      return jsonError(res, 400, "Bereich und Schlüssel angeben.", "query category and key required");
    }
    const ok = tick.assetPoolResolver.removeEntry(q.category, q.key);
    if (!ok) {
      return jsonError(res, 404, "Eintrag nicht gefunden.", "entry not found");
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.post("/asset-pools/default", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const { category, path, paths } = req.body as { category?: string; path?: string; paths?: string[] };
    if (!isNonEmptyString(category)) {
      return jsonError(res, 400, "Bereich wählen.", "category required");
    }
    const entry = paths !== undefined ? parsePoolEntry(paths) : path !== undefined ? parsePoolEntry(path) : null;
    if (!entry) {
      return jsonError(res, 400, "Modell-Pfad angeben.", "path or paths required");
    }
    const pathsToCheck = typeof entry === "string" ? [entry] : entry;
    for (const gp of pathsToCheck) {
      const pe = validateAdminGlbPathForServer(gp);
      if (pe) return jsonError(res, 400, pe, pe);
    }
    const ok = tick.assetPoolResolver.setDefault(category.trim(), entry);
    if (!ok) {
      return jsonError(res, 400, "Ungültige Eingabe.", "invalid category or path values");
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.delete("/asset-pools/default", adminAuthMiddleware, adminWriteBlocked, (req: AdminRequest, res: Response) => {
    const q = req.query as { category?: string };
    if (!isNonEmptyString(q.category)) {
      return jsonError(res, 400, "Bereich angeben.", "query category required");
    }
    const ok = tick.assetPoolResolver.removeDefault(q.category);
    if (!ok) {
      return jsonError(res, 404, "Kein Standard für diesen Bereich.", "default not found");
    }
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  router.post("/asset-pools/reload", adminAuthMiddleware, (req: AdminRequest, res: Response) => {
    tick.assetPoolResolver.reload();
    res.json({ ok: true, document: tick.assetPoolResolver.getDocument() });
  });

  return router;
}
