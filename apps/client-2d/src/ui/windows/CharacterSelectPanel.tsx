/**
 * Character Select Panel — Character Creation
 *
 * Shows character creation form when no character exists.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * Determinism rule:
 * - Character creation uses validated input only.
 * - Server determines success/failure.
 * - The start path is not a class; it only selects starter kit/tutorial focus.
 */

import React, { useState } from "react";
import {
  fetchGameplaySnapshot,
  getDefaultGameplayPlayerId,
  liveGameplayStore,
} from "../../game/liveGameplayStore";

const START_PATHS = [
  "wanderer",
  "forager",
  "miner",
  "angler",
  "artisan",
] as const;

type StartPath = (typeof START_PATHS)[number];

interface StartPathInfo {
  readonly label: string;
  readonly shortLabel: string;
  readonly starterKit: readonly string[];
  readonly tutorialFocus: string;
  readonly firstResourceSpot: string;
  readonly firstGoal: string;
}

const START_PATH_INFO: Record<StartPath, StartPathInfo> = {
  wanderer: {
    label: "Wanderer — Neutral Start",
    shortLabel: "Wanderer",
    starterKit: ["Travel Ration", "Training Spear", "Waymark"],
    tutorialFocus: "Movement, talking to NPCs, first quest, and first combat.",
    firstResourceSpot: "Village square, training field, and first NPC at the waystone.",
    firstGoal: "Speak with the first NPC and secure the outpost.",
  },
  forager: {
    label: "Forager — Gathering Tutorial",
    shortLabel: "Forager",
    starterKit: ["Gathering Bag", "Herb Knife", "Field Note"],
    tutorialFocus: "Finding herbs, berries, mushrooms, and simple natural materials.",
    firstResourceSpot: "Herb meadow at the edge of the forest with foraging nodes.",
    firstGoal: "Collect 3 herbs and bring them to the supply crate.",
  },
  miner: {
    label: "Miner — Ore & Pickaxe",
    shortLabel: "Miner",
    starterKit: ["Simple Pickaxe", "Ore Bag", "Copper Mark"],
    tutorialFocus: "Mining stone, copper, ore veins, and robust materials.",
    firstResourceSpot: "Rock ridge north of the start with stone and copper veins.",
    firstGoal: "Mine 3 copper ore and check the first smelting order.",
  },
  angler: {
    label: "Angler — Water & Fishing Rod",
    shortLabel: "Angler",
    starterKit: ["Simple Fishing Rod", "Bait Bag", "Small Net"],
    tutorialFocus: "Identifying fishing spots, catching fish, and learning to cook.",
    firstResourceSpot: "Pier at the nearby water with a marked fishing spot.",
    firstGoal: "Catch 3 fish and prepare the first cooking order.",
  },
  artisan: {
    label: "Artisan — Workbench & Crafting",
    shortLabel: "Artisan",
    starterKit: ["Tool Roll", "Wood Plank", "Recipe Card"],
    tutorialFocus: "Workbench use, first recipes, simple processing, and repair.",
    firstResourceSpot: "Workbench tent at the start camp with a crafting order.",
    firstGoal: "Craft a wood plank or repair a simple tool.",
  },
};

interface Props {
  onCreated?: () => void;
}

function readStoredDisplayName(): string {
  try {
    return localStorage.getItem("wasd:2d:name")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function CharacterSelectPanel({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState(() => readStoredDisplayName());
  const [startPath, setStartPath] = useState<StartPath>("wanderer");
  const [isCreating, setIsCreating] = useState(false);
  const [status, setStatus] = useState<string>("");
  const selectedPath = START_PATH_INFO[startPath];

  return (
    <section data-testid="character-select" className="are-window character-select-panel">
      <h2>Character Creation</h2>
      <p>
        Create your first Areloria character. Areloria is classless: skills grow through use,
        not through a fixed class.
      </p>

      <label htmlFor="char-name-input" className="character-form-label">
        Name
        <input
          id="char-name-input"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Wanderer"
          minLength={3}
          maxLength={32}
          autoFocus
          className="character-form-input"
        />
      </label>

      <label htmlFor="char-start-path-select" className="character-form-label">
        Start Path
        <select
          id="char-start-path-select"
          value={startPath}
          onChange={(event) => setStartPath(event.target.value as StartPath)}
          className="character-form-select"
        >
          {START_PATHS.map((id) => (
            <option key={id} value={id}>
              {START_PATH_INFO[id].label}
            </option>
          ))}
        </select>
      </label>

      <article className="character-start-path-card" data-testid="character-start-path-card">
        <header>
          <strong>{selectedPath.shortLabel}</strong>
          <span>Start Path · No Class</span>
        </header>
        <dl>
          <div>
            <dt>Starter Kit</dt>
            <dd>{selectedPath.starterKit.join(" · ")}</dd>
          </div>
          <div>
            <dt>Tutorial Focus</dt>
            <dd>{selectedPath.tutorialFocus}</dd>
          </div>
          <div>
            <dt>First Resource Spot</dt>
            <dd>{selectedPath.firstResourceSpot}</dd>
          </div>
          <div>
            <dt>First Goal</dt>
            <dd>{selectedPath.firstGoal}</dd>
          </div>
        </dl>
      </article>

      <p className="character-form-hint">
        No classes, no locks: The start path only determines starting equipment, tutorial focus, and the first
        resource spot. Afterwards, you can train all skills freely.
      </p>

      <button
        type="button"
        className="character-form-button"
        disabled={isCreating}
        aria-busy={isCreating}
        aria-label={isCreating ? "Creating character on server" : "Create new character"}
        onClick={async () => {
          if (displayName.trim().length < 3) {
            setStatus("Name must be at least 3 characters.");
            return;
          }

          setIsCreating(true);
          setStatus("Creating character...");

          try {
            const playerId = getDefaultGameplayPlayerId();
            const response = await fetch(`/api/character/create?playerId=${encodeURIComponent(playerId)}`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-player-id": playerId,
              },
              body: JSON.stringify({
                playerId,
                displayName: displayName.trim(),
                archetype: startPath,
                currentTick: 0,
              }),
            });

            const contentType = response.headers.get("content-type") ?? "";
            const result = contentType.includes("application/json")
              ? await response.json()
              : { ok: false, error: `Server returned non-JSON response (${response.status})` };

            if (result.ok || result.result?.reason === "already_exists") {
              try {
                localStorage.setItem("wasd:2d:name", displayName.trim());
              } catch {}

              setStatus(result.result?.reason === "already_exists" ? "Character already exists. Syncing world snapshot..." : "Character created. Syncing world snapshot...");
              const snapshot = await fetchGameplaySnapshot(playerId);
              if (snapshot) {
                liveGameplayStore.setSnapshot(snapshot);
              }
              setStatus("Character ready.");
              onCreated?.();

              window.dispatchEvent(new CustomEvent("wasd:character-created", {
                detail: { playerId },
              }));

              window.dispatchEvent(new CustomEvent("wasd:toast", {
                detail: {
                  type: "success",
                  message: result.result?.reason === "already_exists" ? "Character loaded" : "Character created",
                },
              }));
            } else {
              setStatus(`Failed: ${result.error ?? result.result?.reason ?? "unknown"}`);
            }
          } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
          } finally {
            setIsCreating(false);
          }
        }}
      >
        {isCreating ? "Creating..." : "Create Character"}
      </button>

      {status && <p className="character-form-status">{status}</p>}
    </section>
  );
}
