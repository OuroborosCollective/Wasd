// @ts-nocheck
import type { Express, Request, Response } from "express";
import type { SelfHealingDashboardConfig, SelfHealingSystem } from "./SelfHealingSystem.js";

export function registerSelfHealingDashboard(
  app: Express,
  system: SelfHealingSystem,
  options: SelfHealingDashboardConfig
): void {
  if (!options.enabled) {
    return;
  }

  app.use(options.routePrefix, (req, res, next) => {
    if (options.allowCors) {
      res.setHeader("Access-Control-Allow-Origin", options.allowedOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get(options.routePrefix, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      module: "SelfHealing Dashboard API",
      endpoints: {
        status: `${options.routePrefix}/status`,
        logs: `${options.routePrefix}/logs`,
        features: `${options.routePrefix}/features`,
        patterns: `${options.routePrefix}/patterns`,
        rules: `${options.routePrefix}/rules`,
        health: `${options.routePrefix}/health`,
      },
    });
  });

  app.get(`${options.routePrefix}/status`, (_req: Request, res: Response) => {
    res.json(system.getStatus());
  });

  app.get(`${options.routePrefix}/health`, (_req: Request, res: Response) => {
    const status = system.getStatus();
    res.json({
      active: status.active,
      uptime: status.uptime,
      totalErrors: status.totalErrors,
      totalHealed: status.totalHealed,
      healingRate: status.healingRate,
    });
  });

  app.get(`${options.routePrefix}/logs`, (req: Request, res: Response) => {
    const count = Math.max(1, Math.min(200, Number(req.query.count ?? 20)));
    res.json(system.getRecentLogs(count));
  });

  app.get(`${options.routePrefix}/features`, (_req: Request, res: Response) => {
    res.json(system.getProtectedFeatures());
  });

  app.get(`${options.routePrefix}/patterns`, (_req: Request, res: Response) => {
    res.json(system.getLearnedPatterns());
  });

  app.get(`${options.routePrefix}/rules`, (_req: Request, res: Response) => {
    res.json(
      system.getRules().map((rule) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        errorType: rule.errorType,
        isFeatureDestructive: rule.isFeatureDestructive,
        pattern: rule.pattern.source,
      }))
    );
  });

  console.log(`[SelfHealingDashboard] enabled at ${options.routePrefix}`);
}
