import { interactionUI, useInteractionUI } from "./UIManager";
import { TradeOverlay } from "./TradeOverlay";
import "./interactionOverlay.css";

interface InteractionClient {
  readonly sendPlayerAction?: (action: string, payload: unknown) => void;
  readonly on?: (event: string, handler: (...args: any[]) => void) => void;
  readonly off?: (event: string, handler: (...args: any[]) => void) => void;
}

interface Props {
  readonly client: InteractionClient | null;
}

export function InteractionOverlayRoot({ client }: Props) {
  const overlay = useInteractionUI();

  if (overlay.type === "NONE") return null;

  return (
    <div className="interaction-overlay-root" aria-live="polite">
      <section className="interaction-panel" role="dialog" aria-modal="true" aria-label={overlay.type}>
        <header className="interaction-panel-header">
          <h2>
            {overlay.type === "TRADE" && "HANDEL"}
            {overlay.type === "CRAFT" && "WERKBANK"}
            {overlay.type === "DIALOGUE" && "GESPRÄCH"}
          </h2>
          <button type="button" className="interaction-close" onClick={() => interactionUI.closeUI()} aria-label="Interaktion schließen">
            ✕
          </button>
        </header>

        {overlay.type === "TRADE" && <TradeOverlay client={client} payload={overlay} />}
        {overlay.type === "CRAFT" && <p className="interaction-muted">Crafting ist serverseitig reserviert und wird als nächstes UI-Modul angeschlossen.</p>}
        {overlay.type === "DIALOGUE" && <p className="interaction-muted">Dialog-Seed: <code>{overlay.dialogueSeed}</code></p>}
      </section>
    </div>
  );
}
