import { useMemo, useSyncExternalStore } from "react";
import { InventoryGrid } from "./InventoryGrid.js";
import {
  StorageOverlay,
  openStorageOverlay,
  closeStorageOverlay,
} from "./StorageOverlay.js";
import { CharacterWindow } from "./windows/CharacterWindow.js";
import { SkillWindow } from "./windows/SkillWindow.js";
import { GuildWindow } from "./windows/GuildWindow.js";
import { CraftingWindow } from "./windows/CraftingWindow.js";
import type { StorageSnapshot } from "./StorageOverlay.js";
import { useLiveGameplaySnapshot } from "../game/useLiveGameplaySnapshot.js";
import "./windows/windows.css";

export type ActiveOverlay =
  | { readonly type: "NONE" }
  | {
      readonly type: "TRADE";
      readonly targetId: string;
      readonly vendorManifest: string;
      readonly lockedAtTick: number;
      readonly dialogueSeed?: string;
    }
  | {
      readonly type: "DIALOGUE";
      readonly targetId: string;
      readonly dialogueSeed: string;
      readonly lockedAtTick: number;
    }
  | {
      readonly type: "CRAFT";
      readonly targetId: string;
      readonly stationManifest: string;
      readonly lockedAtTick: number;
    }
  | { readonly type: "INVENTORY" }
  | { readonly type: "CHARACTER" }
  | { readonly type: "SKILLS" }
  | { readonly type: "CRAFTING" }
  | { readonly type: "GUILD" }
  | {
      readonly type: "STORAGE";
      readonly storageSnapshot: StorageSnapshot;
    };

type InteractionListener = () => void;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toUpperCase();

  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable ||
    target.hasAttribute("contenteditable")
  );
}

class InteractionUIManager {
  private state: ActiveOverlay = { type: "NONE" };
  private readonly listeners = new Set<InteractionListener>();

  public getState = (): ActiveOverlay => {
    return this.state;
  };

  public subscribe = (listener: InteractionListener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  private setState(nextState: ActiveOverlay): void {
    this.state = nextState;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public openTrade(
    payload: Omit<Extract<ActiveOverlay, { type: "TRADE" }>, "type">,
  ): void {
    this.setState({ type: "TRADE", ...payload });
  }

  public openDialogue(
    payload: Omit<Extract<ActiveOverlay, { type: "DIALOGUE" }>, "type">,
  ): void {
    this.setState({ type: "DIALOGUE", ...payload });
  }

  public openCraft(
    payload: Omit<Extract<ActiveOverlay, { type: "CRAFT" }>, "type">,
  ): void {
    this.setState({ type: "CRAFT", ...payload });
  }

  public openInventory(): void {
    this.setState({ type: "INVENTORY" });
  }

  public openCharacter(): void {
    this.setState({ type: "CHARACTER" });
  }

  public openSkills(): void {
    this.setState({ type: "SKILLS" });
  }

  public openCrafting(): void {
    this.setState({ type: "CRAFTING" });
  }

  public openGuild(): void {
    this.setState({ type: "GUILD" });
  }

  public openStorage(storageSnapshot: StorageSnapshot): void {
    openStorageOverlay(storageSnapshot);
    this.setState({ type: "STORAGE", storageSnapshot });
  }

  public closeStorage(): void {
    if (this.state.type === "STORAGE") {
      closeStorageOverlay();
    }

    this.closeUI();
  }

  public closeUI(): void {
    if (this.state.type === "NONE") return;

    if (this.state.type === "STORAGE") {
      closeStorageOverlay();
    }

    this.setState({ type: "NONE" });
  }

  public toggleInventory(): void {
    if (this.state.type === "INVENTORY") {
      this.closeUI();
      return;
    }

    this.openInventory();
  }

  public toggleCharacter(): void {
    if (this.state.type === "CHARACTER") {
      this.closeUI();
      return;
    }

    this.openCharacter();
  }

  public toggleSkills(): void {
    if (this.state.type === "SKILLS") {
      this.closeUI();
      return;
    }

    this.openSkills();
  }

  public toggleCrafting(): void {
    if (this.state.type === "CRAFTING") {
      this.closeUI();
      return;
    }

    this.openCrafting();
  }

  public toggleGuild(): void {
    if (this.state.type === "GUILD") {
      this.closeUI();
      return;
    }

    this.openGuild();
  }
}

export const interactionUI = new InteractionUIManager();

export function useInteractionUI(): ActiveOverlay {
  return useSyncExternalStore(
    interactionUI.subscribe,
    interactionUI.getState,
    interactionUI.getState,
  );
}

export function useOverlayRenderer(): {
  overlay: ActiveOverlay;
  OverlayComponent: React.FC | null;
} {
  const overlay = useInteractionUI();

  const OverlayComponent = useMemo<React.FC | null>(() => {
    switch (overlay.type) {
      case "INVENTORY":
        return function InventoryOverlayComponent() {
          return (
            <InventoryGrid
              isOpen={true}
              onClose={() => interactionUI.closeUI()}
            />
          );
        };

      case "CHARACTER":
        return function CharacterOverlayComponent() {
          return (
            <CharacterWindow
              isOpen={true}
              onClose={() => interactionUI.closeUI()}
            />
          );
        };

      case "SKILLS":
        return function SkillsOverlayComponent() {
          return (
            <SkillWindow
              isOpen={true}
              onClose={() => interactionUI.closeUI()}
            />
          );
        };

      case "CRAFTING":
        return function CraftingOverlayComponent() {
          const snapshot = useLiveGameplaySnapshot();
          return (
            <div className="wow-inventory-overlay" role="dialog" aria-label="Crafting">
              <div className="wow-inventory-header">
                <h2>CRAFTING</h2>
                <button className="wow-close-btn" onClick={() => interactionUI.closeUI()} aria-label="Close [ESC]">
                  <kbd className="cz-kbd">ESC</kbd>
                  ✕
                </button>
              </div>
              <CraftingWindow crafting={snapshot.crafting ?? { recipes: [] }} />
            </div>
          );
        };

      case "GUILD":
        return function GuildOverlayComponent() {
          return (
            <GuildWindow
              isOpen={true}
              onClose={() => interactionUI.closeUI()}
            />
          );
        };

      case "STORAGE":
        return function StorageOverlayComponent() {
          return (
            <StorageOverlay
              isOpen={true}
              onClose={() => interactionUI.closeStorage()}
            />
          );
        };

      case "DIALOGUE":
      case "CRAFT":
      case "TRADE":
      case "NONE":
      default:
        return null;
    }
  }, [overlay.type]);

  return { overlay, OverlayComponent };
}

function handleInteractionShortcut(event: KeyboardEvent): void {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();

  switch (key) {
    case "i":
    case "tab":
      event.preventDefault();
      interactionUI.toggleInventory();
      return;

    case "c":
      event.preventDefault();
      interactionUI.toggleCharacter();
      return;

    case "k":
      event.preventDefault();
      interactionUI.toggleSkills();
      return;

    case "b":
      event.preventDefault();
      interactionUI.toggleCrafting();
      return;

    case "g":
      event.preventDefault();
      interactionUI.toggleGuild();
      return;

    case "escape":
      event.preventDefault();
      interactionUI.closeUI();
      return;

    default:
      return;
  }
}

declare global {
  interface Window {
    __areloriaInteractionUIShortcutsRegistered?: boolean;
  }
}

if (typeof window !== "undefined") {
  if (!window.__areloriaInteractionUIShortcutsRegistered) {
    window.addEventListener("keydown", handleInteractionShortcut);
    window.__areloriaInteractionUIShortcutsRegistered = true;
  }
}
