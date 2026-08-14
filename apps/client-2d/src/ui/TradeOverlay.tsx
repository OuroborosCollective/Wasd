import { useEffect, useState } from 'react';
import type { ActiveOverlay } from './UIManager';

interface Props {
  readonly payload: Extract<ActiveOverlay, { type: 'TRADE' }>;
}

function sendClientAction(action: string, payload: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent('wasd:client-action', { detail: { action, payload } }));
}

export function TradeOverlay({ payload }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleNetworkPacket = (event: Event): void => {
      const detail = (event as CustomEvent<{ event?: string }>).detail;
      if (detail?.event === 'TRANSACTION_COMPLETE' || detail?.event === 'TRANSACTION_FAILED')
        setIsProcessing(false);
    };
    window.addEventListener('wasd:network-packet', handleNetworkPacket);
    return () => window.removeEventListener('wasd:network-packet', handleNetworkPacket);
  }, []);

  const handleBuy = (itemId: string, quantity: number): void => {
    if (isProcessing) return;
    setIsProcessing(true);
    sendClientAction('BUY_VENDOR_ITEM', {
      targetId: payload.targetId,
      vendorManifest: payload.vendorManifest,
      itemId,
      quantity,
    });
  };

  return (
    <div className="trade-overlay" role="region" aria-label="Trade Offer">
      <p className="interaction-muted">
        Offer based on <code>{payload.vendorManifest}</code>
      </p>

      <div className="trade-item-row">
        <div>
          <strong>Starter Rations</strong>
          <span>5x supplies for the first paths around Millbrook.</span>
        </div>
        <button
          type="button"
          disabled={isProcessing}
          aria-busy={isProcessing}
          aria-label={isProcessing ? "Purchasing Starter Rations..." : "Buy Starter Rations for 10 Silver"}
          title={isProcessing ? "Purchasing Starter Rations..." : "Buy Starter Rations for 10 Silver"}
          onClick={() => handleBuy('item_ration_5', 1)}
        >
          {isProcessing ? "Buying..." : "10 Silver"}
        </button>
      </div>

      {isProcessing && (
        <div className="trade-processing" role="status" aria-live="polite">
          Validating transaction …
        </div>
      )}
    </div>
  );
}
