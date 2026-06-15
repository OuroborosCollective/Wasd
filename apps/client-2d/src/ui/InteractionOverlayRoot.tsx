import { useEffect } from 'react';
import { interactionUI, useInteractionUI, useOverlayRenderer } from './UIManager';
import { TradeOverlay } from './TradeOverlay';
import './interactionOverlay.css';

function payloadOf(packet: unknown): any {
  const detail = (packet as CustomEvent<{ event?: string; payload?: any }>).detail;
  return detail?.payload?.payload ?? detail?.payload ?? {};
}

function eventNameOf(packet: unknown): string | null {
  const detail = (packet as CustomEvent<{ event?: string; payload?: any }>).detail;
  return detail?.event ?? detail?.payload?.type ?? detail?.payload?.event ?? null;
}

export function InteractionOverlayRoot() {
  const overlay = useInteractionUI();
  const { OverlayComponent } = useOverlayRenderer();

  useEffect(() => {
    const onNetworkPacket = (event: Event): void => {
      const packetName = eventNameOf(event);
      const payload = payloadOf(event);
      if (packetName === 'INTERACTION_ACCEPTED') {
        const targetId = String(payload.targetId ?? 'unknown_target');
        const lockedAtTick = Number(payload.lockedAtTick ?? 0);
        const interactionType = payload.interactionType ?? payload.type;
        if (interactionType === 'TRADE') {
          interactionUI.openTrade({
            targetId,
            vendorManifest: String(
              payload.payload?.vendorManifest ??
                payload.vendorManifest ??
                'mara_starter_supplies_v1'
            ),
            dialogueSeed: payload.payload?.dialogueSeed ?? payload.dialogueSeed,
            lockedAtTick,
          });
        } else if (interactionType === 'CRAFT') {
          interactionUI.openCraft({
            targetId,
            stationManifest: String(
              payload.payload?.stationManifest ?? payload.stationManifest ?? 'smithing_station_v1'
            ),
            lockedAtTick,
          });
        } else {
          interactionUI.openDialogue({
            targetId,
            dialogueSeed: String(
              payload.payload?.dialogueSeed ?? payload.dialogueSeed ?? `${targetId}:dialogue`
            ),
            lockedAtTick,
          });
        }
      }
      if (packetName === 'INTERACTION_REJECTED' || packetName === 'INTERACTION_CLOSED')
        interactionUI.closeUI();
    };
    window.addEventListener('wasd:network-packet', onNetworkPacket);
    return () => window.removeEventListener('wasd:network-packet', onNetworkPacket);
  }, []);

  if (overlay.type === 'NONE') return null;

  return (
    <div className="interaction-overlay-root" aria-live="polite">
      <section
        className="interaction-panel"
        role="dialog"
        aria-modal="true"
        aria-label={overlay.type}
      >
        <header className="interaction-panel-header">
          <h2>
            {overlay.type === 'TRADE' && 'TRADE'}
            {overlay.type === 'CRAFT' && 'CRAFTING'}
            {overlay.type === 'DIALOGUE' && 'DIALOGUE'}
          </h2>
          <div className="interaction-header-actions">
            <kbd className="interaction-esc-hint">ESC</kbd>
            <button
              type="button"
              className="interaction-close"
              onClick={() => interactionUI.closeUI()}
              aria-label="Close interaction"
            >
              ✕
            </button>
          </div>
        </header>

        {overlay.type === 'TRADE' && <TradeOverlay payload={overlay} />}
        {overlay.type === 'CRAFT' && (
          <p className="interaction-muted">
            Crafting is server-side reserved and will be connected as the next UI module.
          </p>
        )}
        {overlay.type === 'DIALOGUE' && (
          <p className="interaction-muted">
            Dialogue Seed: <code>{overlay.dialogueSeed}</code>
          </p>
        )}
        {OverlayComponent && <OverlayComponent />}
      </section>
    </div>
  );
}
