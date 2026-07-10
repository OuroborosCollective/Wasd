import { useCallback } from "react";
import { craftRecipe } from "../../game/crafting";
import {
  DEFAULT_GAMEPLAY_PLAYER_ID,
  fetchGameplaySnapshot,
  liveGameplayStore,
} from "../../game/liveGameplayStore";
import type { CraftingSnapshot } from "../../game/liveGameplaySnapshot";
import { useLiveGameplaySnapshot } from "../../game/useLiveGameplaySnapshot";

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

function buttonLabel(craftable: boolean, blockedReason?: string): string {
  if (craftable) return "Craft now";
  switch (blockedReason) {
    case "missing_ingredients": return "Missing Items";
    case "station_too_far": return "Move to Station";
    case "missing_player_position": return "Waiting for Position";
    case "level_too_low": return "Level Locked";
    default: return "Runtime Evidence Missing";
  }
}

function stationRequirement(recipe: { stationType?: string }): string | null {
  if (!recipe.stationType) return null;
  const emoji = STATION_EMOJI[recipe.stationType] ?? "⚙️";
  const name = STATION_NAME[recipe.stationType] ?? recipe.stationType;
  return `${emoji} ${name} required`;
}

function toast(type: "success" | "error", message: string): void {
  window.dispatchEvent(new CustomEvent("wasd:toast", { detail: { type, message } }));
}

export function CraftingWindow({ isOpen = true, onClose }: CraftingWindowProps) {
  const snapshot = useLiveGameplaySnapshot();
  const crafting: CraftingSnapshot = snapshot.crafting ?? { recipes: [] };
  const recipes = crafting.recipes ?? [];

  const handleCraft = useCallback(async (recipeId: string) => {
    const result = await craftRecipe(recipeId);
    if (!result.ok || !result.result?.ok) {
      const reason = result.result?.reason;
      toast(
        "error",
        reason === "station_too_far"
          ? "Move near the required station"
          : reason === "missing_player_position"
            ? "Server player position is unavailable"
            : reason === "missing_ingredients"
              ? "Missing required items"
              : `Craft failed${reason ? `: ${reason}` : ""}`,
      );
      return;
    }

    const next = await fetchGameplaySnapshot(DEFAULT_GAMEPLAY_PLAYER_ID);
    if (!next) {
      liveGameplayStore.markStale();
      toast("error", "Craft committed, but the newer server revision could not be loaded");
      return;
    }
    liveGameplayStore.setSnapshot(next, DEFAULT_GAMEPLAY_PLAYER_ID);
    toast(
      "success",
      result.result.replayed
        ? "Craft intent was already committed"
        : `Crafted ${result.result.outputs?.[0]?.itemId ?? "item"}`,
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Crafting">
      <div className="wow-inventory-header">
        <h2>CRAFTING</h2>
        {onClose && <button className="wow-close-btn" onClick={onClose} aria-label="Close">✕</button>}
      </div>

      <div className="char-content">
        {snapshot.status !== "live" ? (
          <div className="crafting-empty" role="status">
            Crafting {snapshot.status}. Actions remain blocked until a newer server revision arrives.
          </div>
        ) : recipes.length === 0 ? (
          <div className="crafting-empty">
            <p>No server crafting recipes available.</p>
          </div>
        ) : (
          <div className="crafting-list">
            {recipes.map((recipe) => {
              const station = stationRequirement(recipe);
              return (
                <article key={recipe.id} className="crafting-row">
                  <div className="crafting-row__header">
                    <strong>{recipe.title}</strong>
                    <span className="crafting-row__xp">+{recipe.craftingXpReward} XP</span>
                  </div>
                  <div className="crafting-row__meta">
                    Requires Crafting Lv. {recipe.requiredLevel}
                    {station && <span className="crafting-row__station">{station}</span>}
                    <span className="crafting-row__station">
                      {recipe.craftTicks === 0 ? "Immediate server commit" : `${recipe.craftTicks} ticks`}
                    </span>
                  </div>
                  <div className="crafting-row__items">
                    <div className="crafting-row__ingredients">
                      <span className="crafting-row__label">Input:</span>
                      <span>{recipe.ingredients.map((item) => `${item.quantity}× ${item.itemId}`).join(", ")}</span>
                    </div>
                    <div className="crafting-row__outputs">
                      <span className="crafting-row__label">Output:</span>
                      <span>{recipe.outputs.map((item) => `${item.quantity}× ${item.itemId}`).join(", ")}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="crafting-row__button"
                    disabled={!recipe.craftable}
                    onClick={() => handleCraft(recipe.id)}
                    data-testid={`process-${recipe.id}`}
                  >
                    {buttonLabel(recipe.craftable, recipe.blockedReason)}
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
