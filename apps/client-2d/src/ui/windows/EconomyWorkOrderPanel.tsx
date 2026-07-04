import { useCallback, useEffect, useState } from "react";

type EconomyWorkOrderKind = "resource_supply";

interface EconomyWorkOrderSnapshot {
  readonly schemaVersion: 1;
  readonly orderId: string;
  readonly kind: EconomyWorkOrderKind;
  readonly npcId: string;
  readonly vendorId: string;
  readonly itemId: string;
  readonly title: string;
  readonly currentStock: number;
  readonly requiredQuantity: number;
  readonly rewardCoins: number;
  readonly tick: number;
  readonly stateHash: string;
}

interface EconomyWorkOrderResponse {
  readonly ok: boolean;
  readonly tick?: number;
  readonly vendorId?: string;
  readonly orders?: EconomyWorkOrderSnapshot[];
  readonly error?: string;
}

interface WorkOrderPanelState {
  readonly status: "loading" | "ready" | "error";
  readonly vendorId: string;
  readonly tick: number | null;
  readonly orders: readonly EconomyWorkOrderSnapshot[];
  readonly error: string | null;
}

const DEFAULT_STATE: WorkOrderPanelState = {
  status: "loading",
  vendorId: "village_trader_001",
  tick: null,
  orders: [],
  error: null,
};

function itemLabel(itemId: string): string {
  return itemId.replace(/[_-]/g, " ");
}

async function fetchServerWorkOrders(vendorId: string, signal?: AbortSignal): Promise<WorkOrderPanelState> {
  const response = await fetch(`/api/economy/work-orders?vendorId=${encodeURIComponent(vendorId)}`, {
    cache: "no-store",
    signal,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload: EconomyWorkOrderResponse = contentType.includes("application/json")
    ? await response.json()
    : { ok: false, error: `Server returned non-JSON response (${response.status})` };

  if (!response.ok || !payload.ok) {
    return {
      status: "error",
      vendorId,
      tick: null,
      orders: [],
      error: payload.error ?? `work_order_fetch_failed_${response.status}`,
    };
  }

  return {
    status: "ready",
    vendorId: payload.vendorId ?? vendorId,
    tick: typeof payload.tick === "number" ? payload.tick : null,
    orders: [...(payload.orders ?? [])].sort((a, b) => a.orderId.localeCompare(b.orderId)),
    error: null,
  };
}

export function EconomyWorkOrderPanel() {
  const [state, setState] = useState<WorkOrderPanelState>(DEFAULT_STATE);

  const loadWorkOrders = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const nextState = await fetchServerWorkOrders(DEFAULT_STATE.vendorId, signal);
      setState(nextState);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState({
        status: "error",
        vendorId: DEFAULT_STATE.vendorId,
        tick: null,
        orders: [],
        error: error instanceof Error ? error.message : "work_order_fetch_failed",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkOrders(controller.signal);
    return () => controller.abort();
  }, [loadWorkOrders]);

  if (state.status === "loading") {
    return (
      <div className="stitch-grid-panel" data-testid="economy-work-orders-loading">
        <article className="stitch-info">
          <small>NPC Work Orders</small>
          <b>waiting for server economy state</b>
        </article>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="stitch-grid-panel" data-testid="economy-work-orders-error">
        <article className="stitch-info">
          <small>NPC Work Orders</small>
          <b>{state.error ?? "server work orders unavailable"}</b>
        </article>
        <button type="button" className="character-form-button" onClick={() => void loadWorkOrders()}>
          Retry Server Sync
        </button>
      </div>
    );
  }

  if (state.orders.length === 0) {
    return (
      <div className="stitch-grid-panel" data-testid="economy-work-orders-empty">
        <article className="stitch-info">
          <small>NPC Work Orders</small>
          <b>no server work orders</b>
        </article>
        <article className="stitch-info">
          <small>Vendor</small>
          <b>{state.vendorId}</b>
        </article>
        <article className="stitch-info">
          <small>Tick</small>
          <b>{state.tick ?? "waiting"}</b>
        </article>
        <button type="button" className="character-form-button" onClick={() => void loadWorkOrders()}>
          Refresh From Server
        </button>
      </div>
    );
  }

  return (
    <div className="quest-journal-panel" data-testid="economy-work-orders-live">
      <article className="stitch-info">
        <small>Server Work Orders</small>
        <b>{state.orders.length} active · tick {state.tick ?? "waiting"}</b>
      </article>

      {state.orders.map((order) => (
        <article key={order.orderId} className="quest-journal-card quest-journal-card--active">
          <header>
            <small>{order.kind} · {order.vendorId}</small>
            <b>{order.title}</b>
          </header>
          <p>
            {itemLabel(order.itemId)} stock is {order.currentStock}. Need {order.requiredQuantity} more from the server economy state.
          </p>
          <div className="stitch-grid-panel">
            <article className="stitch-info">
              <small>Reward</small>
              <b>{order.rewardCoins} coin</b>
            </article>
            <article className="stitch-info">
              <small>State Hash</small>
              <b>{order.stateHash.slice(0, 10)}</b>
            </article>
            <article className="stitch-info">
              <small>NPC</small>
              <b>{order.npcId}</b>
            </article>
          </div>
        </article>
      ))}

      <button type="button" className="character-form-button" onClick={() => void loadWorkOrders()}>
        Refresh From Server
      </button>
    </div>
  );
}
