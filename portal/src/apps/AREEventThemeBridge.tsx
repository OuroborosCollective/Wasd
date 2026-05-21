import { useEffect } from "react";
import { pushAREEventTheme } from "@wasd/shared";

interface OracleStatusResponse {
  ok?: boolean;
  active?: boolean;
  prophecyCount?: number;
  generatedAtTick?: number | null;
}

interface RepairStatusResponse {
  ok?: boolean;
  autoRepair?: {
    active?: boolean;
    lastPlan?: { severity?: number; sector?: number } | null;
    totalRepairs?: number;
    totalRollbacks?: number;
  } | null;
}

interface GovernanceStatusResponse {
  ok?: boolean;
  activeDirectives?: unknown[];
  openDirectives?: unknown[];
  directives?: unknown[];
  participation?: number;
}

function safeSeverity(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function AREEventThemeBridge({ active = true }: { active?: boolean }): null {
  useEffect(() => {
    if (!active) return undefined;

    let disposed = false;
    let tick = 0;

    const tickTimer = window.setInterval(() => {
      tick += 1;
      pushAREEventTheme({ kind: "tick", tick, phase: (tick % 10) / 9, severity: 0.08 });
    }, 100);

    const poll = async () => {
      const [oracle, repair, governance] = await Promise.all([
        fetchJson<OracleStatusResponse>("/api/are/replay/oracle/status"),
        fetchJson<RepairStatusResponse>("/api/are/replay/repair/status"),
        fetchJson<GovernanceStatusResponse>("/api/are/replay/governance/status"),
      ]);
      if (disposed) return;

      if (oracle && (oracle.active || Number(oracle.prophecyCount ?? 0) > 0)) {
        pushAREEventTheme({
          kind: "oracle",
          tick: Number(oracle?.generatedAtTick ?? tick),
          active: true,
          severity: Math.min(1, 0.38 + Number(oracle?.prophecyCount ?? 0) * 0.12),
          label: "oracle-prophecy",
        });
      }

      const repairActive = Boolean(repair?.autoRepair?.active || repair?.autoRepair?.lastPlan);
      if (repairActive) {
        pushAREEventTheme({
          kind: "repair",
          tick,
          active: true,
          severity: safeSeverity(repair?.autoRepair?.lastPlan?.severity, 0.82),
          label: `repair-${repair?.autoRepair?.lastPlan?.sector ?? "grid"}`,
        });
      }

      const directiveCount =
        Number((governance?.activeDirectives as unknown[] | undefined)?.length ?? 0) +
        Number((governance?.openDirectives as unknown[] | undefined)?.length ?? 0) +
        Number((governance?.directives as unknown[] | undefined)?.length ?? 0);
      if (directiveCount > 0) {
        pushAREEventTheme({
          kind: "governance",
          tick,
          active: true,
          severity: Math.min(1, 0.22 + directiveCount * 0.08 + Number(governance?.participation ?? 0) * 0.4),
          label: "sovereign-council",
        });
      }
    };

    void poll();
    const pollTimer = window.setInterval(poll, 2500);

    return () => {
      disposed = true;
      window.clearInterval(tickTimer);
      window.clearInterval(pollTimer);
    };
  }, [active]);

  return null;
}

export default AREEventThemeBridge;
