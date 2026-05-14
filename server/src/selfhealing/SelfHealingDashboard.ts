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

  const routePrefix = options.routePrefix ?? "/api/self-healing";
  const allowCors = options.allowCors ?? false;
  const allowedOrigin = options.allowedOrigin ?? "*";

  app.use(routePrefix, (req, res, next) => {
    if (allowCors) {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get(routePrefix, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      module: "SelfHealing Dashboard API",
      endpoints: {
        status: `${routePrefix}/status`,
        logs: `${routePrefix}/logs`,
        features: `${routePrefix}/features`,
        patterns: `${routePrefix}/patterns`,
        rules: `${routePrefix}/rules`,
        health: `${routePrefix}/health`,
      },
    });
  });

  app.get(`${routePrefix}/status`, (_req: Request, res: Response) => {
    res.json(system.getStatus());
  });

  app.get(`${routePrefix}/health`, (_req: Request, res: Response) => {
    const status = system.getStatus();
    res.json({
      active: status.active,
      uptime: status.uptime,
      totalErrors: status.totalErrors,
      totalHealed: status.totalHealed,
      healingRate: status.healingRate,
    });
  });

  app.get(`${routePrefix}/logs`, (req: Request, res: Response) => {
    const count = Math.max(1, Math.min(200, Number(req.query.count ?? 20)));
    res.json(system.getRecentLogs(count));
  });

  app.get(`${routePrefix}/features`, (_req: Request, res: Response) => {
    res.json(system.getProtectedFeatures());
  });

  app.get(`${routePrefix}/patterns`, (_req: Request, res: Response) => {
    res.json(system.getLearnedPatterns());
  });

  app.get(`${routePrefix}/rules`, (_req: Request, res: Response) => {
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

  console.log(`[SelfHealingDashboard] enabled at ${routePrefix}`);
}
