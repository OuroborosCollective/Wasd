import { useCallback, useEffect, useState } from "react";
import { craftRecipe } from "../../game/crafting";
import {
  fetchGameplaySnapshot,
  getDefaultGameplayPlayerId,
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

function stationRequirement(recipe: { stationType?: string }): { emoji: string; text: string } | null {
  if (!recipe.stationType) return null;
  const emoji = STATION_EMOJI[recipe.stationType] ?? "⚙️";
  const name = STATION_NAME[recipe.stationType] ?? recipe.stationType;
  return { emoji, text: `${name} required` };
}

function getButtonTooltip(
  recipe: { title: string; craftable: boolean; blockedReason?: string; requiredLevel: number },
  isPending: boolean,
): string {
  if (isPending) return `Craft request pending for ${recipe.title}`;
  if (recipe.craftable) return `Craft ${recipe.title}`;
  switch (recipe.blockedReason) {
    case "missing_ingredients":
      return `Missing required ingredients to craft ${recipe.title}`;
    case "station_too_far":
      return `Move closer to required station to craft ${recipe.title}`;
    case "level_too_low":
      return `Requires Crafting Lv. ${recipe.requiredLevel}`;
    default:
      return `Cannot craft ${recipe.title}: ${recipe.blockedReason ?? "requirements not met"}`;
  }
}

function toast(type: "success" | "error", message: string): void {
  window.dispatchEvent(new CustomEvent("wasd:toast", { detail: { type, message } }));
}

export function CraftingWindow({ isOpen = true, onClose }: CraftingWindowProps) {
  const snapshot = useLiveGameplaySnapshot();
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const crafting: CraftingSnapshot = snapshot.crafting ?? { recipes: [] };
  const recipes = crafting.recipes ?? [];

  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCraft = useCallback(async (recipeId: string) => {
    const actorId = getDefaultGameplayPlayerId();
    const beforeEvidence = liveGameplayStore.getEvidence();
    if (snapshot.status !== "live" || !beforeEvidence || beforeEvidence.playerId !== actorId) {
      liveGameplayStore.markStale();
      toast("error", "Craft blocked: current actor revision is unavailable");
      return;
    }

    setPendingRecipeId(recipeId);
    try {
      const response = await craftRecipe(recipeId);
      if (!response.ok || !response.result?.ok) {
        if (response.craftCommitted) {
          liveGameplayStore.markStale();
          toast("error", "Craft committed, but its quest/history follow-up is not confirmed");
          return;
        }
        const reason = response.result?.reason ?? response.error;
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

      const receiptHash = response.result.receiptHash;
      const questHistoryHash = response.questProgressHistoryHash;
      if (
        response.craftCommitted !== true ||
        response.questProgressCommitted !== true ||
        !receiptHash ||
        !questHistoryHash
      ) {
        liveGameplayStore.markStale();
        toast("error", "Craft response lacks persisted receipt or quest-history evidence");
        return;
      }

      const next = await fetchGameplaySnapshot(actorId);
      if (!next) {
        liveGameplayStore.markStale();
        toast("error", "Craft committed, but the server revision could not be loaded");
        return;
      }
      const applied = liveGameplayStore.setSnapshot(next, actorId, {
        ...(response.result.replayed ? {} : { after: beforeEvidence }),
        expectedMutationHash: questHistoryHash,
      });
      if (!applied) {
        toast("error", "Craft committed, but the returned revision does not prove this mutation");
        return;
      }

      toast(
        "success",
        response.result.replayed
          ? "Craft receipt and existing follow-up revision confirmed"
          : `Crafted ${response.result.outputs?.[0]?.itemId ?? "item"}`,
      );
    } finally {
      setPendingRecipeId((current) => current === recipeId ? null : current);
    }
  }, [snapshot.status]);

  if (!isOpen) return null;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Crafting">
      <div className="wow-inventory-header">
        <h2>CRAFTING</h2>
        {onClose && (
          <button className="wow-close-btn" onClick={onClose} aria-label="Close [ESC]" aria-keyshortcuts="Escape">
            <kbd className="cz-kbd" aria-hidden="true">ESC</kbd>
            ✕
          </button>
        )}
      </div>

      <div className="char-content">
        {snapshot.status !== "live" ? (
          <div className="crafting-empty" role="status">
            Crafting {snapshot.status}. Actions remain blocked until a newer server revision arrives.
          </div>
        ) : recipes.length === 0 ? (
          <div className="crafting-empty"><p>No server crafting recipes available.</p></div>
        ) : (
          <div className="crafting-list">
            {recipes.map((recipe) => {
              const station = stationRequirement(recipe);
              const requestPending = pendingRecipeId === recipe.id;
              return (
                <article key={recipe.id} className="crafting-row">
                  <div className="crafting-row__header">
                    <strong>{recipe.title}</strong>
                    <span className="crafting-row__xp">+{recipe.craftingXpReward} XP</span>
                  </div>
                  <div className="crafting-row__meta">
                    Requires Crafting Lv. {recipe.requiredLevel}
                    {station && (
                      <span className="crafting-row__station" title={station.text}>
                        <span aria-hidden="true">{station.emoji} </span>
                        {station.text}
                      </span>
                    )}
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
                  {(() => {
                    const tooltip = getButtonTooltip(recipe, requestPending);
                    return (
                      <button
                        type="button"
                        className="crafting-row__button"
                        disabled={!recipe.craftable || pendingRecipeId !== null}
                        onClick={() => handleCraft(recipe.id)}
                        data-testid={`process-${recipe.id}`}
                        aria-busy={requestPending}
                        aria-label={tooltip}
                        title={tooltip}
                      >
                        {requestPending ? "REQUEST PENDING" : buttonLabel(recipe.craftable, recipe.blockedReason)}
                      </button>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
