/**
 * Crafting Window
 *
 * Shows player crafting recipes from LiveGameplaySnapshot.
 * Server-authoritative display only - client cannot craft directly.
 * Uses LiveGameplaySnapshot for reactive updates.
 * After crafting, refetches snapshot to update inventory and quest progress.
 * Shows station requirements and proximity feedback.
 */

import { useCallback } from "react";
import { useLiveGameplaySnapshot } from "../../game/useLiveGameplaySnapshot";
import { craftRecipe } from "../../game/crafting";
import { fetchGameplaySnapshot, liveGameplayStore, DEFAULT_GAMEPLAY_PLAYER_ID } from "../../game/liveGameplayStore";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";

interface CraftingWindowProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

const STATION_EMOJI: Record<string, string> = {
  campfire: "🔥",
  furnace: "🧱",
  workbench: "🛠",
};

const STATION_NAME: Record<string, string> = {
  campfire: "Campfire",
  furnace: "Furnace",
  workbench: "Workbench",
};

function getBlockedMessage(blockedReason?: string): string {
  switch (blockedReason) {
    case "missing_ingredients":
      return "Missing Items";
    case "station_too_far":
      return "Move to Station";
    case "missing_player_position":
      return "Waiting for position";
    case "level_too_low":
      return "Level Locked";
    default:
      return "Locked";
  }
}

function getStationRequirement(recipe: { stationType?: string }): string | null {
  if (!recipe.stationType) return null;
  const emoji = STATION_EMOJI[recipe.stationType] ?? "⚙️";
  const name = STATION_NAME[recipe.stationType] ?? recipe.stationType;
  return `${emoji} ${name} required`;
}

export function CraftingWindow({ isOpen = true, onClose }: CraftingWindowProps) {
  const snapshot = useLiveGameplaySnapshot();
  const crafting: CraftingSnapshot = snapshot.crafting ?? { recipes: [] };
  const recipes = crafting.recipes ?? [];

  const handleCraft = useCallback(async (recipeId: string) => {
    const result = await craftRecipe(recipeId);

    if (result.ok && result.result?.ok) {
      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "success",
            message: `Crafted ${result.result.outputs?.[0]?.itemId ?? "item"}!`,
          },
        }),
      );

      // Refetch snapshot to update inventory, crafting state, and quest progress
      const next = await fetchGameplaySnapshot(DEFAULT_GAMEPLAY_PLAYER_ID);
      if (next) {
        liveGameplayStore.setSnapshot(next);
      }
    } else {
      const reason = result.result?.reason;
      let message = "Craft failed";
      if (reason === "station_too_far") {
        message = "Move near a station to craft this";
      } else if (reason === "missing_player_position") {
        message = "Waiting for position sync...";
      } else if (reason === "missing_ingredients") {
        message = "Missing required items";
      } else if (reason) {
        message = `Craft failed: ${reason}`;
      }

      window.dispatchEvent(
        new CustomEvent("wasd:toast", {
          detail: {
            type: "error",
            message,
          },
        }),
      );
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Crafting">
      <div className="wow-inventory-header">
        <h2>CRAFTING</h2>

        {onClose && (
          <button className="wow-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <div className="char-content">
        {recipes.length === 0 ? (
          <div className="crafting-empty">
            <p>No crafting recipes available.</p>
            <p className="are-text-muted">Gather resources to unlock recipes.</p>
          </div>
        ) : (
          <div className="crafting-list">
            {recipes.map((recipe) => {
              const stationReq = getStationRequirement(recipe);
              return (
                <article key={recipe.id} className="crafting-row">
                  <div className="crafting-row__header">
                    <strong>{recipe.title}</strong>
                    <span className="crafting-row__xp">+{recipe.craftingXpReward} XP</span>
                  </div>

                  <div className="crafting-row__meta">
                    Requires Crafting Lv. {recipe.requiredLevel}
                    {stationReq && (
                      <span className="crafting-row__station">{stationReq}</span>
                    )}
                  </div>

                  <div className="crafting-row__items">
                    <div className="crafting-row__ingredients">
                      <span className="crafting-row__label">Input:</span>
                      <span>
                        {recipe.ingredients
                          .map((item) => `${item.quantity}× ${item.itemId}`)
                          .join(", ")}
                      </span>
                    </div>
                    <div className="crafting-row__outputs">
                      <span className="crafting-row__label">Output:</span>
                      <span>
                        {recipe.outputs
                          .map((item) => `${item.quantity}× ${item.itemId}`)
                          .join(", ")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="crafting-row__button"
                    disabled={!recipe.craftable}
                    onClick={() => handleCraft(recipe.id)}
                  >
                    {getBlockedMessage(recipe.blockedReason)}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}