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

import React, { useState, useCallback } from "react";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";

interface Props {
  crafting: CraftingSnapshot;
  onCraft?: (recipeId: string) => void | Promise<void>;
}

export function CraftingPanel({ crafting, onCraft }: Props) {
  const recipes = crafting?.recipes ?? [];
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftingRecipeId, setCraftingRecipeId] = useState<string | null>(null);

  const handleCraft = useCallback(async (recipeId: string) => {
    if (isCrafting || !onCraft) return;
    setIsCrafting(true);
    setCraftingRecipeId(recipeId);
    try {
      await Promise.resolve(onCraft(recipeId));
    } catch (error) {
      console.error("[CraftingPanel] error executing onCraft", error);
    } finally {
      setIsCrafting(false);
      setCraftingRecipeId(null);
    }
  }, [isCrafting, onCraft]);

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
        {recipes.map((recipe) => {
          const isRecipeCrafting = isCrafting && craftingRecipeId === recipe.id;
          const isButtonDisabled = !recipe.craftable || isCrafting;

          let buttonLabelText = "Craft";
          let buttonTitleText = `Craft ${recipe.title}`;

          if (isRecipeCrafting) {
            buttonLabelText = "Crafting...";
            buttonTitleText = `Crafting ${recipe.title} in progress`;
          } else if (!recipe.craftable) {
            if (recipe.blockedReason === "missing_ingredients") {
              buttonLabelText = "Missing Items";
              buttonTitleText = `Missing required items to craft ${recipe.title}`;
            } else if (recipe.blockedReason === "level_too_low" || recipe.blockedReason === "locked") {
              buttonLabelText = "Locked";
              buttonTitleText = `Required Crafting Lv. ${recipe.requiredLevel} is too high`;
            } else {
              buttonLabelText = "Locked";
              buttonTitleText = `Recipe locked: ${recipe.blockedReason ?? "unmet requirements"}`;
            }
          } else if (isCrafting) {
            buttonTitleText = "Another crafting action is already in progress";
          }

          return (
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
                disabled={isButtonDisabled}
                onClick={() => handleCraft(recipe.id)}
                aria-busy={isRecipeCrafting}
                aria-label={
                  isRecipeCrafting
                    ? `Crafting ${recipe.title} in progress`
                    : !recipe.craftable
                      ? `Cannot craft ${recipe.title}: ${buttonTitleText}`
                      : `Craft ${recipe.title}`
                }
                title={buttonTitleText}
              >
                {buttonLabelText}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}