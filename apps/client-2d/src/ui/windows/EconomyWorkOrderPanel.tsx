import { useCallback, useEffect, useMemo, useState } from 'react';
import { readPlayerPositionBridge } from '../../game/PlayerPositionBridge';

type EconomyWorkOrderKind = 'resource_supply';

type VendorActorEvidence = {
  readonly schemaVersion: 1;
  readonly actorId: string;
  readonly actorType: 'npc';
  readonly role: 'vendor';
  readonly vendorType: 'resource_trader';
  readonly position: { readonly x: number; readonly y: number };
  readonly chunkKey: string;
  readonly definitionHash: string;
};

type EconomyWorkOrderSnapshot = {
  readonly schemaVersion: 1;
  readonly orderId: string;
  readonly kind: EconomyWorkOrderKind;
  readonly npcId: string;
  readonly npcActorHash: string;
  readonly vendorId: string;
  readonly itemId: string;
  readonly title: string;
  readonly currentStock: number;
  readonly requiredQuantity: number;
  readonly tick: number;
  readonly stateHash: string;
};

type VerifiedWorkOrderResponse = {
  readonly tick: number;
  readonly tickId: number | string;
  readonly vendorId: string;
  readonly actorEvidence: VendorActorEvidence;
  readonly revisionHash: string;
  readonly orders: readonly EconomyWorkOrderSnapshot[];
};

type StoredMutationEvidence = {
  readonly intentHash: string;
  readonly historyHash: string;
  readonly tick: number;
  readonly itemId: string;
};

type PanelState = {
  readonly status: 'loading' | 'ready' | 'error';
  readonly refreshing: boolean;
  readonly data: VerifiedWorkOrderResponse | null;
  readonly error: string | null;
  readonly actionStatus: 'idle' | 'submitting' | 'stored' | 'error';
  readonly actionError: string | null;
  readonly storedMutation: StoredMutationEvidence | null;
};

const ECONOMY_MUTATION_EVENT = 'are:economy-state-mutated';
const PANEL_SOURCE = 'economy-work-order-panel';

const INITIAL_STATE: PanelState = {
  status: 'loading',
  refreshing: false,
  data: null,
  error: null,
  actionStatus: 'idle',
  actionError: null,
  storedMutation: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeTick(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9:_./-]{1,200}$/.test(value);
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{1,128}$/.test(value);
}

function isTickId(value: unknown): value is number | string {
  return isSafeTick(value) || isSafeIdentifier(value);
}

function parseActorEvidence(value: unknown, vendorId: string): VendorActorEvidence {
  if (!isRecord(value)) throw new Error('missing_vendor_actor_evidence');
  const position = value.position;
  if (!isRecord(position) || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new Error('invalid_vendor_actor_position');
  }
  if (
    value.schemaVersion !== 1 ||
    value.actorId !== vendorId ||
    value.actorType !== 'npc' ||
    value.role !== 'vendor' ||
    value.vendorType !== 'resource_trader' ||
    !isSafeIdentifier(value.chunkKey) ||
    !isHash(value.definitionHash)
  ) {
    throw new Error('invalid_vendor_actor_evidence');
  }

  return Object.freeze({
    schemaVersion: 1,
    actorId: vendorId,
    actorType: 'npc',
    role: 'vendor',
    vendorType: 'resource_trader',
    position: Object.freeze({ x: Number(position.x), y: Number(position.y) }),
    chunkKey: value.chunkKey,
    definitionHash: value.definitionHash,
  });
}

function parseOrder(
  value: unknown,
  responseTick: number,
  vendorId: string,
  actor: VendorActorEvidence
): EconomyWorkOrderSnapshot {
  if (!isRecord(value)) throw new Error('invalid_work_order');
  if (
    value.schemaVersion !== 1 ||
    value.kind !== 'resource_supply' ||
    !isSafeIdentifier(value.orderId) ||
    !isSafeIdentifier(value.itemId) ||
    typeof value.title !== 'string' ||
    value.title.trim().length === 0 ||
    value.vendorId !== vendorId ||
    value.npcId !== actor.actorId ||
    value.npcActorHash !== actor.definitionHash ||
    value.tick !== responseTick ||
    !isSafeTick(value.currentStock) ||
    !isSafeTick(value.requiredQuantity) ||
    value.requiredQuantity <= 0 ||
    !isHash(value.stateHash)
  ) {
    throw new Error('invalid_work_order_evidence');
  }

  return Object.freeze({
    schemaVersion: 1,
    orderId: value.orderId,
    kind: 'resource_supply',
    npcId: value.npcId,
    npcActorHash: value.npcActorHash,
    vendorId,
    itemId: value.itemId,
    title: value.title.trim(),
    currentStock: value.currentStock,
    requiredQuantity: value.requiredQuantity,
    tick: responseTick,
    stateHash: value.stateHash,
  });
}

export function parseVerifiedWorkOrderResponse(value: unknown): VerifiedWorkOrderResponse {
  if (!isRecord(value) || value.ok !== true) throw new Error('work_order_runtime_not_ok');
  if (!isSafeTick(value.tick) || !isTickId(value.tickId))
    throw new Error('missing_work_order_tick_evidence');
  if (!isSafeIdentifier(value.vendorId) || !isHash(value.revisionHash)) {
    throw new Error('missing_work_order_revision_evidence');
  }
  if (!Array.isArray(value.orders)) throw new Error('missing_work_order_list_evidence');

  const actorEvidence = parseActorEvidence(value.actorEvidence, value.vendorId);
  const orders = value.orders
    .map((order) => parseOrder(order, value.tick, value.vendorId, actorEvidence))
    .sort((a, b) => a.orderId.localeCompare(b.orderId));

  return Object.freeze({
    tick: value.tick,
    tickId: value.tickId,
    vendorId: value.vendorId,
    actorEvidence,
    revisionHash: value.revisionHash,
    orders: Object.freeze(orders),
  });
}

function parseStoredMutationEvidence(
  value: unknown,
  expectedVendorId: string,
  expectedItemId: string
): StoredMutationEvidence {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.result) ||
    value.result.ok !== true
  ) {
    const reason =
      isRecord(value) && isRecord(value.result) && typeof value.result.reason === 'string'
        ? value.result.reason
        : isRecord(value) && typeof value.error === 'string'
          ? value.error
          : 'supply_not_committed';
    throw new Error(reason);
  }
  const canonicalIntent = value.canonicalIntent;
  if (!isRecord(canonicalIntent) || !isRecord(canonicalIntent.payload)) {
    throw new Error('missing_supply_intent_evidence');
  }
  if (
    canonicalIntent.action !== 'interact' ||
    canonicalIntent.payload.interaction !== 'sell_resource' ||
    canonicalIntent.payload.targetId !== expectedVendorId ||
    canonicalIntent.payload.itemId !== expectedItemId ||
    canonicalIntent.payload.quantity !== 1 ||
    !isSafeTick(canonicalIntent.logicalIndex) ||
    typeof canonicalIntent.intentHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(canonicalIntent.intentHash) ||
    value.result.itemId !== expectedItemId ||
    value.result.quantitySold !== 1 ||
    value.result.reason !== 'sold' ||
    !isHash(value.result.historyHash)
  ) {
    throw new Error('invalid_supply_commit_evidence');
  }

  return Object.freeze({
    intentHash: canonicalIntent.intentHash,
    historyHash: value.result.historyHash,
    tick: canonicalIntent.logicalIndex,
    itemId: expectedItemId,
  });
}

function itemLabel(itemId: string): string {
  return itemId.replace(/[_-]/g, ' ');
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(`server_returned_non_json_${response.status}`);
  }
  return response.json();
}

async function fetchServerWorkOrders(signal?: AbortSignal): Promise<VerifiedWorkOrderResponse> {
  const response = await fetch('/api/economy/work-orders', {
    cache: 'no-store',
    signal,
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const error =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : `work_order_fetch_failed_${response.status}`;
    throw new Error(error);
  }
  return parseVerifiedWorkOrderResponse(payload);
}

export function EconomyWorkOrderPanel() {
  const [state, setState] = useState<PanelState>(INITIAL_STATE);
  const playerPosition = useMemo(() => readPlayerPositionBridge(), [state.data?.tick]);

  const loadWorkOrders = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({
      ...current,
      status: current.data ? current.status : 'loading',
      refreshing: Boolean(current.data),
      error: null,
    }));
    try {
      const data = await fetchServerWorkOrders(signal);
      setState((current) => ({
        ...current,
        status: 'ready',
        refreshing: false,
        data,
        error: null,
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState((current) => ({
        ...current,
        status: 'error',
        refreshing: false,
        data: null,
        error: error instanceof Error ? error.message : 'work_order_fetch_failed',
      }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadWorkOrders(controller.signal);

    const handleMutation = (event: Event) => {
      const detail = event instanceof CustomEvent && isRecord(event.detail) ? event.detail : null;
      if (detail?.source === PANEL_SOURCE) return;
      void loadWorkOrders();
    };
    window.addEventListener(ECONOMY_MUTATION_EVENT, handleMutation);

    return () => {
      controller.abort();
      window.removeEventListener(ECONOMY_MUTATION_EVENT, handleMutation);
    };
  }, [loadWorkOrders]);

  const supplyOne = useCallback(
    async (order: EconomyWorkOrderSnapshot) => {
      const data = state.data;
      const position = readPlayerPositionBridge();
      if (!data || !position) {
        setState((current) => ({
          ...current,
          actionStatus: 'error',
          actionError: 'player_position_input_unavailable',
        }));
        return;
      }

      setState((current) => ({
        ...current,
        actionStatus: 'submitting',
        actionError: null,
      }));

      try {
        const response = await fetch('/api/economy/sell-resource', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: order.itemId,
            quantity: 1,
            vendorId: data.vendorId,
            playerPosition: position,
            requestId: `work-order:${order.stateHash}:supply:${data.tick}`,
          }),
        });
        const payload = await readJsonResponse(response);
        const storedMutation = parseStoredMutationEvidence(payload, data.vendorId, order.itemId);
        if (!response.ok) throw new Error('supply_not_committed');

        setState((current) => ({
          ...current,
          actionStatus: 'stored',
          actionError: null,
          storedMutation,
        }));
        window.dispatchEvent(
          new CustomEvent(ECONOMY_MUTATION_EVENT, {
            detail: {
              source: PANEL_SOURCE,
              intentHash: storedMutation.intentHash,
              historyHash: storedMutation.historyHash,
              tick: storedMutation.tick,
            },
          })
        );
        await loadWorkOrders();
      } catch (error) {
        setState((current) => ({
          ...current,
          actionStatus: 'error',
          actionError: error instanceof Error ? error.message : 'supply_not_committed',
        }));
      }
    },
    [loadWorkOrders, state.data]
  );

  if (state.status === 'loading' && !state.data) {
    return (
      <div
        className="stitch-grid-panel"
        data-testid="economy-work-orders-loading"
        aria-live="polite"
        aria-busy="true"
      >
        <article className="stitch-info">
          <small>NPC Work Orders</small>
          <b>waiting for verified server economy state</b>
        </article>
      </div>
    );
  }

  if (state.status === 'error' || !state.data) {
    return (
      <div className="stitch-grid-panel" data-testid="economy-work-orders-error" role="alert">
        <article className="stitch-info">
          <small>NPC Work Orders unavailable</small>
          <b>{state.error ?? 'missing_runtime_evidence'}</b>
        </article>
        <button
          type="button"
          className="character-form-button"
          onClick={() => void loadWorkOrders()}
          aria-label="Retry loading work orders from the server"
        >
          Retry Server Evidence
        </button>
      </div>
    );
  }

  const data = state.data;
  const evidenceSummary = `${data.actorEvidence.actorId} · ${data.actorEvidence.chunkKey} · ${data.revisionHash.slice(0, 10)}`;

  if (data.orders.length === 0) {
    return (
      <div
        className="stitch-grid-panel"
        data-testid="economy-work-orders-empty"
        role="region"
        aria-label="NPC Work Orders"
      >
        <article className="stitch-info">
          <small>NPC Work Orders</small>
          <b>verified empty at tick {data.tick}</b>
        </article>
        <article className="stitch-info">
          <small>Actor / Revision</small>
          <b>{evidenceSummary}</b>
        </article>
        {state.storedMutation && <StoredEvidence evidence={state.storedMutation} />}
        <button
          type="button"
          className="character-form-button"
          onClick={() => void loadWorkOrders()}
          disabled={state.refreshing}
          aria-label={
            state.refreshing
              ? 'Verifying and updating server work orders'
              : 'Refresh server work orders'
          }
          aria-busy={state.refreshing}
        >
          {state.refreshing ? 'Verifying…' : 'Refresh Server Evidence'}
        </button>
      </div>
    );
  }

  return (
    <div
      className="quest-journal-panel"
      data-testid="economy-work-orders-live"
      role="region"
      aria-label="Verified Server Work Orders"
    >
      <article className="stitch-info">
        <small>Verified Server Work Orders</small>
        <b>
          {data.orders.length} active · tick {data.tick}
          {state.refreshing ? ' · verifying' : ''}
        </b>
      </article>
      <article className="stitch-info">
        <small>Actor / Revision</small>
        <b>{evidenceSummary}</b>
      </article>

      {data.orders.map((order) => {
        const totalRequired = order.currentStock + order.requiredQuantity;
        const progressPercent =
          totalRequired > 0
            ? Math.min(100, Math.round((order.currentStock / totalRequired) * 100))
            : 0;

        return (
          <article key={order.orderId} className="quest-journal-card quest-journal-card--active">
            <header>
              <small>
                {order.kind} · {order.vendorId}
              </small>
              <b>{order.title}</b>
            </header>
            <p>
              {itemLabel(order.itemId)} stock is {order.currentStock}. Server state needs{' '}
              {order.requiredQuantity} more.
            </p>

            <div
              role="progressbar"
              aria-label={`${itemLabel(order.itemId)} stock level`}
              aria-valuenow={order.currentStock}
              aria-valuemin={0}
              aria-valuemax={totalRequired}
              aria-valuetext={`${order.currentStock} of ${totalRequired} (${progressPercent}%)`}
              title={`${itemLabel(order.itemId)} stock: ${order.currentStock}/${totalRequired} (${progressPercent}%)`}
              style={{
                height: 6,
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                overflow: 'hidden',
                margin: '8px 0',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent >= 100 ? '#39ff14' : '#00e5ff',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>

            <div className="stitch-grid-panel">
            <article className="stitch-info">
              <small>State Hash</small>
              <b>{order.stateHash.slice(0, 10)}</b>
            </article>
            <article className="stitch-info">
              <small>NPC Evidence</small>
              <b>{order.npcActorHash.slice(0, 10)}</b>
            </article>
          </div>
          <button
            type="button"
            className="character-form-button"
            disabled={!playerPosition || state.actionStatus === 'submitting'}
            onClick={() => void supplyOne(order)}
            aria-label={
              state.actionStatus === 'submitting'
                ? `Committing supply of ${itemLabel(order.itemId)}`
                : `Supply 1 ${itemLabel(order.itemId)} to vendor`
            }
            aria-busy={state.actionStatus === 'submitting'}
            title={
              !playerPosition ? 'Player position is unavailable. Cannot submit supply.' : undefined
            }
          >
            {state.actionStatus === 'submitting'
              ? 'Committing…'
              : `Supply 1 ${itemLabel(order.itemId)}`}
          </button>
          {!playerPosition && (
            <small className="are-text-muted" style={{ display: 'block', marginTop: '4px' }}>
              Player position input unavailable; no mutation can be sent.
            </small>
          )}
        </article>
        );
      })}

      {state.actionStatus === 'error' && (
        <article className="stitch-info" data-testid="economy-work-order-action-error" role="alert">
          <small>Supply not committed</small>
          <b>{state.actionError ?? 'unknown_error'}</b>
        </article>
      )}
      {state.storedMutation && <StoredEvidence evidence={state.storedMutation} />}

      <button
        type="button"
        className="character-form-button"
        onClick={() => void loadWorkOrders()}
        disabled={state.refreshing}
        aria-label={
          state.refreshing
            ? 'Verifying and updating server work orders'
            : 'Refresh server work orders'
        }
        aria-busy={state.refreshing}
      >
        {state.refreshing ? 'Verifying…' : 'Refresh Server Evidence'}
      </button>
    </div>
  );
}

function StoredEvidence({ evidence }: { evidence: StoredMutationEvidence }) {
  return (
    <article className="stitch-info" data-testid="economy-work-order-stored-evidence">
      <small>Stored mutation · tick {evidence.tick}</small>
      <b>
        intent {evidence.intentHash.slice(0, 10)} · history {evidence.historyHash.slice(0, 10)}
      </b>
    </article>
  );
}
