import { useEffect, useState } from "react";
import type { ActiveOverlay } from "./UIManager";

interface Props {
  readonly payload: Extract<ActiveOverlay, { type: "TRADE" }>;
}

function sendClientAction(action: string, payload: Record<string, unknown>): void {
  window.dispatchEvent(new CustomEvent("wasd:client-action", { detail: { action, payload } }));
}

export function TradeOverlay({ payload }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleNetworkPacket = (event: Event): void => {
      const detail = (event as CustomEvent<{ event?: string }>).detail;
      if (detail?.event === "TRANSACTION_COMPLETE" || detail?.event === "TRANSACTION_FAILED") setIsProcessing(false);
    };
    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  const handleBuy = (itemId: string, quantity: number): void => {
    if (isProcessing) return;
    setIsProcessing(true);
    sendClientAction("BUY_VENDOR_ITEM", {
      targetId: payload.targetId,
      vendorManifest: payload.vendorManifest,
      itemId,
      quantity,
    });
  };

  return (
    <div className="trade-overlay">
      <p className="interaction-muted">
        Angebot basiert auf <code>{payload.vendorManifest}</code>
      </p>

      <div className="trade-item-row">
        <div>
          <strong>Starter Rationen</strong>
          <span>5x Vorrat für die ersten Wege um Millbrook.</span>
        </div>
        <button type="button" disabled={isProcessing} onClick={() => handleBuy("item_ration_5", 1)}>
          10 Silber
        </button>
      </div>

      {isProcessing && <div className="trade-processing">Transaktion wird validiert …</div>}
    </div>
  );
}
