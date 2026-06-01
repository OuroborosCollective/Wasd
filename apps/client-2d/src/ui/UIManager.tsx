import { useSyncExternalStore } from "react";
import { InventoryGrid } from "./InventoryGrid.js";
import { CharacterOverlay } from "./CharacterOverlay.js";
import { StorageOverlay, openStorageOverlay, closeStorageOverlay } from "./StorageOverlay.js";
import { CharacterWindow } from "./windows/CharacterWindow.js";
import { SkillWindow } from "./windows/SkillWindow.js";
import { GuildWindow } from "./windows/GuildWindow.js";
import type { StorageSnapshot } from "./StorageOverlay.js";
import "./windows/windows.css";

export type ActiveOverlay =
  | { readonly type: "NONE" }
  | { readonly type: "TRADE"; readonly targetId: string; readonly vendorManifest: string; readonly lockedAtTick: number; readonly dialogueSeed?: string }
  | { readonly type: "DIALOGUE"; readonly targetId: string; readonly dialogueSeed: string; readonly lockedAtTick: number }
  | { readonly type: "CRAFT"; readonly targetId: string; readonly stationManifest: string; readonly lockedAtTick: number }
  | { readonly type: "INVENTORY" }
  | { readonly type: "CHARACTER" }
  | { readonly type: "SKILLS" }
  | { readonly type: "GUILD" }
  | { readonly type: "STORAGE"; readonly storageSnapshot: StorageSnapshot };

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

  public openStorage(storageSnapshot: StorageSnapshot): void {
    this.state = { type: "STORAGE", storageSnapshot };
    openStorageOverlay(storageSnapshot);
    this.notify();
  }

  public closeStorage(): void {
    if (this.state.type === "STORAGE") {
      closeStorageOverlay();
      this.closeUI();
    } else {
      this.closeUI();
    }
  }

  public toggleCharacter(): void {
    if (this.state.type === "CHARACTER") {
      this.closeUI();
    } else {
      this.openCharacter();
    }
  }

  public openSkills(): void {
    this.state = { type: "SKILLS" };
    this.notify();
  }

  public openGuild(): void {
    this.state = { type: "GUILD" };
    this.notify();
  }

  public toggleSkills(): void {
    if (this.state.type === "SKILLS") {
      this.closeUI();
    } else {
      this.openSkills();
    }
  }

  public toggleGuild(): void {
    if (this.state.type === "GUILD") {
      this.closeUI();
    } else {
      this.openGuild();
    }
  }

  public closeUI(): void {
    if (this.state.type === "NONE") return;
    // Close storage overlay if open
    if (this.state.type === "STORAGE") {
      closeStorageOverlay();
    }
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
        return () => <InventoryGrid isOpen={true} onClose={() => interactionUI.closeUI()} />;
      case "CHARACTER":
        return () => <CharacterWindow isOpen={true} onClose={() => interactionUI.closeUI()} />;
      case "SKILLS":
        return () => <SkillWindow isOpen={true} onClose={() => interactionUI.closeUI()} />;
      case "GUILD":
        return () => <GuildWindow isOpen={true} onClose={() => interactionUI.closeUI()} />;
      case "STORAGE":
        return () => <StorageOverlay isOpen={true} onClose={() => interactionUI.closeStorage()} />;
      // Legacy CharacterOverlay for compatibility
      case "DIALOGUE":
        return null;
      case "CRAFT":
        return null;
      case "TRADE":
        return null;
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
    if (e.key === "k" || e.key === "K") {
      // Skills window toggle
      if (document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.hasAttribute("contenteditable")) {
        e.preventDefault();
        interactionUI.toggleSkills();
      }
    }
    if (e.key === "g" || e.key === "G") {
      // Guild window toggle
      if (document.activeElement?.tagName !== "INPUT" && 
          document.activeElement?.tagName !== "TEXTAREA" &&
          !document.activeElement?.hasAttribute("contenteditable")) {
        e.preventDefault();
        interactionUI.toggleGuild();
      }
    }
    if (e.key === "Escape") {
      interactionUI.closeUI();
    }
  });
}
