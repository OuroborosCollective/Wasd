/**
 * Crafting Window
 *
 * Shows player crafting recipes from LiveGameplaySnapshot.
 * Server-authoritative display only - client cannot craft directly.
 * Uses LiveGameplaySnapshot for reactive updates.
 */

import { useEffect, useCallback } from "react";
import { useLiveGameplaySnapshot } from "../../game/useLiveGameplaySnapshot";
import { craftRecipe } from "../../game/crafting";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";

interface CraftingWindowProps {
  readonly isOpen?: boolean;
  readonly onClose?: () => void;
}

export function CraftingWindow({ isOpen = true, onClose }: CraftingWindowProps) {
  const snapshot = useLiveGameplaySnapshot();
  const crafting: CraftingSnapshot = snapshot.crafting ?? { recipes: [] };
  const recipes = crafting.recipes ?? [];

  const handleCraft = useCallback(async (recipeId: string) => {
    const result = await craftRecipe(recipeId);
    window.dispatchEvent(
      new CustomEvent("wasd:toast", {
        detail: {
          type: result.ok && result.result.ok ? "success" : "error",
          message: result.ok && result.result.ok
            ? "Crafted item successfully!"
            : `Craft failed: ${result.result?.reason ?? "unknown"}`,
        },
      })
    );
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
            {recipes.map((recipe) => (
              <article key={recipe.id} className="crafting-row">
                <div className="crafting-row__header">
                  <strong>{recipe.title}</strong>
                  <span className="crafting-row__xp">+{recipe.craftingXpReward} XP</span>
                </div>

                <div className="crafting-row__meta">
                  Requires Crafting Lv. {recipe.requiredLevel}
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
                  {recipe.craftable
                    ? "Craft"
                    : recipe.blockedReason === "missing_ingredients"
                      ? "Missing Items"
                      : "Locked"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}