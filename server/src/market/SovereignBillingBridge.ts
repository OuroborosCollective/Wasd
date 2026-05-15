import type { GameWebSocketServer } from "../networking/WebSocketServer.js";
import { areValidationState } from "../are/AREValidationState.js";
import { sovereignMarket } from "./SovereignMarket.js";

function buildSuspendedGuard(tickCount: number, payload: any, message: string): any {
  return {
    ok: false,
    tick: tickCount,
    lastCheckedAtTick: tickCount,
    kappa: Number(payload?.k ?? payload?.kappa ?? 1000),
    seed: payload?.deterministicSeed ?? payload?.seed ?? null,
    checkedCorePaths: [],
    violations: [{
      code: "ACCOUNT_SUSPENDED",
      message,
      value: "SUSPENDED_NO_ARE_CREDITS",
    }],
  };
}

function currentTick(tick: any): number {
  return Number(tick?.tickCount ?? 0);
}

function hashCountFromTick(tick: any): number {
  const snapshot = tick?.getWorldHashSnapshot?.() ?? tick?.lastWorldHashSnapshot ?? null;
  if (!snapshot) return 1;
  return 2 + Number(snapshot?.chunks?.length ?? 0);
}

export function attachSovereignBillingBridge(tick: any, ws: GameWebSocketServer): void {
  if (!tick || tick.__sovereignBillingBridgeAttached) return;
  tick.__sovereignBillingBridgeAttached = true;
  tick.__sdkBillingSuspended = false;
  tick.__sdkBillingMessage = null;

  tick.getSovereignMarketStatus = () => sovereignMarket.getStatus();
  tick.getSdkBillingStatus = () => ({
    suspended: Boolean(tick.__sdkBillingSuspended),
    message: tick.__sdkBillingMessage,
    market: sovereignMarket.getStatus(),
  });

  const originalUpdateAREContract = tick.updateAREContract?.bind(tick);
  if (typeof originalUpdateAREContract !== "function") {
    tick.__sdkBillingMessage = "Emily: Billing bridge konnte WorldTick.updateAREContract nicht finden.";
    return;
  }

  tick.updateAREContract = (payload: any, players: any[], npcs: any[], loot: any[]) => {
    const account = sovereignMarket.resolveAccount(process.env.ARE_SDK_CLIENT_ID || "local-engine", process.env.ARE_SDK_DISPLAY_NAME || "local-engine");
    const tickCount = currentTick(tick);

    if (tick.__sdkBillingSuspended && account.status === "active" && account.credits > 0) {
      tick.__sdkBillingSuspended = false;
      tick.__sdkBillingMessage = `Emily: ${account.displayName}, Guthaben erkannt. ARE-Hashing wird wieder aufgenommen.`;
      ws.broadcast({ type: "CHAT_MSG", payload: { channel: "system", sender: "Emily-Sales", text: tick.__sdkBillingMessage } });
    }

    if (tick.__sdkBillingSuspended || account.status === "suspended" || account.credits <= 0) {
      tick.__sdkBillingSuspended = true;
      const message = account.lastMessage || `Emily: ${account.displayName}, dein ARE-Guthaben ist erschöpft. Neue deterministische Hashes sind pausiert.`;
      tick.__sdkBillingMessage = message;
      const suspendedGuard = buildSuspendedGuard(tickCount, payload, message);
      tick.lastAREGuardStatus = suspendedGuard;
      areValidationState.updateGuard(suspendedGuard);
      if (tickCount % 10 === 0) {
        ws.broadcast({ type: "ARE_SUSPENDED", payload: tick.getSdkBillingStatus() });
        ws.broadcast({ type: "CHAT_MSG", payload: { channel: "system", sender: "Emily-Sales", text: message } });
      }
      return;
    }

    originalUpdateAREContract(payload, players, npcs, loot);

    const hashCount = hashCountFromTick(tick);
    const usage = tick.getDeterministicUsageStats?.() ?? { hashesInWindow: hashCount, hashesPerMinute: hashCount };
    const billing = sovereignMarket.meterUsage({
      usage: { ...usage, hashesInWindow: hashCount, hashesPerMinute: hashCount },
      tick: tickCount,
      source: process.env.ARE_SDK_CLIENT_ID || "local-engine",
      displayName: process.env.ARE_SDK_DISPLAY_NAME || "local-engine",
    });
    tick.__sdkBillingMessage = billing.message;

    if (!billing.allowed) {
      tick.__sdkBillingSuspended = true;
      ws.broadcast({ type: "ARE_SUSPENDED", payload: tick.getSdkBillingStatus() });
    }

    if (tickCount % 10 === 0) {
      ws.broadcast({ type: "ARE_BILLING", payload: { usage, billing, market: sovereignMarket.getStatus() } });
      ws.broadcast({ type: "CHAT_MSG", payload: { channel: "system", sender: "Emily-Sales", text: billing.message } });
    }
  };
}
