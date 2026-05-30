import { useSyncExternalStore } from "react";
import { InventoryOverlay } from "./InventoryOverlay.js";
import { CharacterOverlay } from "./CharacterOverlay.js";

export type ActiveOverlay =
  | { readonly type: "NONE" }
  | { readonly type: "TRADE"; readonly targetId: string; readonly vendorManifest: string; readonly lockedAtTick: number; readonly dialogueSeed?: string }
  | { readonly type: "DIALOGUE"; readonly targetId: string; readonly dialogueSeed: string; readonly lockedAtTick: number }
  | { readonly type: "CRAFT"; readonly targetId: string; readonly stationManifest: string; readonly lockedAtTick: number }
  | { readonly type: "INVENTORY" }
  | { readonly type: "CHARACTER" };

class InteractionUIManager {
  private state: ActiveOverlay = { type: "NONE" };
  private readonly listeners = new Set<() => void>();

  public getState = (): ActiveOverlay => this.state;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  public openTrade(payload: Omit<Extract<ActiveOverlay, { type: "TRADE" }>, "type">): void {
    this.state = { type: "TRADE", ...payload };
    this.notify();
  }

  public openDialogue(payload: Omit<Extract<ActiveOverlay, { type: "DIALOGUE" }>, "type">): void {
    this.state = { type: "DIALOGUE", ...payload };
    this.notify();
  }

  public openCraft(payload: Omit<Extract<ActiveOverlay, { type: "CRAFT" }>, "type">): void {
    this.state = { type: "CRAFT", ...payload };
    this.notify();
  }

  public openInventory(): void {
    this.state = { type: "INVENTORY" };
    this.notify();
  }

  public openCharacter(): void {
    this.state = { type: "CHARACTER" };
    this.notify();
  }

  public toggleCharacter(): void {
    if (this.state.type === "CHARACTER") {
      this.closeUI();
    } else {
      this.openCharacter();
    }
  }

  public closeUI(): void {
    if (this.state.type === "NONE") return;
    this.state = { type: "NONE" };
    this.notify();
  }

  public toggleInventory(): void {
    if (this.state.type === "INVENTORY") {
      this.closeUI();
    } else {
      this.openInventory();
    }
  }
}

export const interactionUI = new InteractionUIManager();

export function useInteractionUI(): ActiveOverlay {
  return useSyncExternalStore(interactionUI.subscribe, interactionUI.getState, interactionUI.getState);
}

/**
 * Hook to render the appropriate overlay based on current state.
 * Usage: const { OverlayComponent } = useOverlayRenderer();
 */
export function useOverlayRenderer(): { 
  overlay: ActiveOverlay; 
  OverlayComponent: React.FC | null 
} {
  const overlay = useInteractionUI();
  
  const OverlayComponent: React.FC | null = (() => {
    switch (overlay.type) {
      case "INVENTORY":
        return () => <InventoryOverlay isOpen={true} onClose={() => interactionUI.closeUI()} />;
      case "CHARACTER":
        return () => <CharacterOverlay isOpen={true} onClose={() => interactionUI.closeUI()} />;
      // Add other overlay types as they are implemented
      default:
        return null;
    }
  })();

  return { overlay, OverlayComponent };
}

// Register keyboard shortcuts
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    if (e.key === "i" || e.key === "I" || e.key === "Tab") {
      // Only toggle if not in a text input
      if (document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.hasAttribute("contenteditable")) {
        e.preventDefault();
        interactionUI.toggleInventory();
      }
    }
    if (e.key === "c" || e.key === "C") {
      // Character sheet toggle
      if (document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.hasAttribute("contenteditable")) {
        e.preventDefault();
        interactionUI.toggleCharacter();
      }
    }
    if (e.key === "Escape") {
      interactionUI.closeUI();
    }
  });
}
