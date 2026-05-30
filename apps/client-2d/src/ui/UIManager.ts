import { useSyncExternalStore } from "react";

export type ActiveOverlay =
  | { readonly type: "NONE" }
  | { readonly type: "TRADE"; readonly targetId: string; readonly vendorManifest: string; readonly lockedAtTick: number; readonly dialogueSeed?: string }
  | { readonly type: "DIALOGUE"; readonly targetId: string; readonly dialogueSeed: string; readonly lockedAtTick: number }
  | { readonly type: "CRAFT"; readonly targetId: string; readonly stationManifest: string; readonly lockedAtTick: number };

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

  public closeUI(): void {
    if (this.state.type === "NONE") return;
    this.state = { type: "NONE" };
    this.notify();
  }
}

export const interactionUI = new InteractionUIManager();

export function useInteractionUI(): ActiveOverlay {
  return useSyncExternalStore(interactionUI.subscribe, interactionUI.getState, interactionUI.getState);
}
