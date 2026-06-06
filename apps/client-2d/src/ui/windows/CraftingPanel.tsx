/**
 * Crafting Panel
 *
 * Displays player crafting recipes from LiveGameplaySnapshot.
 * Server-authoritative display only - client cannot craft directly.
 *
 * Rules:
 * - No Math.random() for display
 * - No Date.now() for state
 * - Shows server-provided values only
 */

import React from "react";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  crafting: CraftingSnapshot;
  onCraft?: (recipeId: string) => void;
}

export function CraftingPanel({ crafting, onCraft }: Props) {
  const recipes = crafting?.recipes ?? [];

  if (!recipes.length) {
    return (
      <section data-testid="crafting-panel-empty" className="are-window">
        <h2>Crafting</h2>
        <p className="are-text-muted">No crafting recipes yet.</p>
      </section>
    );
  }

  return (
    <section data-testid="crafting-panel-live" className="are-window">
      <h2>Crafting</h2>

      <div className="crafting-list">
        {recipes.map((recipe) => (
          <article key={recipe.id} className="crafting-row">
            <div className="crafting-row__header">
              <strong>{recipe.title}</strong>
              <span>+{recipe.craftingXpReward} XP</span>
            </div>

            <div className="crafting-row__meta">
              Requires Crafting Lv. {recipe.requiredLevel}
            </div>

            <div className="crafting-row__items">
              <span>
                Input:{" "}
                {recipe.ingredients
                  .map((item) => `${item.quantity}× ${item.itemId}`)
                  .join(", ")}
              </span>
              <span>
                Output:{" "}
                {recipe.outputs
                  .map((item) => `${item.quantity}× ${item.itemId}`)
                  .join(", ")}
              </span>
            </div>

            <button
              type="button"
              disabled={!recipe.craftable}
              onClick={() => onCraft?.(recipe.id)}
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
    </section>
  );
}