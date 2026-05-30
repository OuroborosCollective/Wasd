import { useEffect, useState } from "react";
import type { ActiveOverlay } from "./UIManager";

interface InteractionClient {
  readonly sendPlayerAction?: (action: string, payload: unknown) => void;
  readonly on?: (event: string, handler: (...args: any[]) => void) => void;
  readonly off?: (event: string, handler: (...args: any[]) => void) => void;
}

interface Props {
  readonly client: InteractionClient | null;
  readonly payload: Extract<ActiveOverlay, { type: "TRADE" }>;
}

export function TradeOverlay({ client, payload }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!client?.on || !client?.off) return undefined;
    const handleTransactionComplete = () => setIsProcessing(false);
    client.on("TRANSACTION_COMPLETE", handleTransactionComplete);
    client.on("TRANSACTION_FAILED", handleTransactionComplete);
    return () => {
      client.off?.("TRANSACTION_COMPLETE", handleTransactionComplete);
      client.off?.("TRANSACTION_FAILED", handleTransactionComplete);
    };
  }, [client]);

  const handleBuy = (itemId: string, quantity: number): void => {
    if (!client?.sendPlayerAction || isProcessing) return;
    setIsProcessing(true);
    client.sendPlayerAction("BUY_VENDOR_ITEM", {
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
        <button type="button" disabled={isProcessing || !client?.sendPlayerAction} onClick={() => handleBuy("item_ration_5", 1)}>
          10 Silber
        </button>
      </div>

      {isProcessing && <div className="trade-processing">Transaktion wird validiert …</div>}
    </div>
  );
}
