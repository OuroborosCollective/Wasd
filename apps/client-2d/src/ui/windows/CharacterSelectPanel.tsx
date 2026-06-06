/**
 * Character Select Panel — Character Creation
 *
 * Shows character creation form when no character exists.
 * Follows the Panzerschrank brutalist design aesthetic.
 *
 * Determinism rule:
 * - Character creation uses validated input only.
 * - Server determines success/failure.
 */

import React, { useState } from "react";

const ARCHETYPES = [
  "wanderer",
  "forager",
  "miner",
  "angler",
  "artisan",
] as const;

interface Props {
  onCreated?: () => void;
}

export function CharacterSelectPanel({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [archetype, setArchetype] = useState<(typeof ARCHETYPES)[number]>("wanderer");
  const [status, setStatus] = useState<string>("");

  return (
    <section data-testid="character-select" className="are-window character-select-panel">
      <h2>Character Selection</h2>
      <p>Create your first Areloria character.</p>

      <label className="character-form-label">
        Name
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Wanderer"
          minLength={3}
          maxLength={32}
          className="character-form-input"
        />
      </label>

      <label className="character-form-label">
        Archetype
        <select
          value={archetype}
          onChange={(event) => setArchetype(event.target.value as (typeof ARCHETYPES)[number])}
          className="character-form-select"
        >
          {ARCHETYPES.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="character-form-button"
        onClick={async () => {
          if (displayName.trim().length < 3) {
            setStatus("Name must be at least 3 characters.");
            return;
          }

          setStatus("Creating character...");

          try {
            const response = await fetch("/api/character/create", {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                displayName: displayName.trim(),
                archetype,
                currentTick: 0,
              }),
            });

            const result = await response.json();

            if (result.ok) {
              setStatus("Character created.");
              onCreated?.();

              // Dispatch toast notification
              window.dispatchEvent(new CustomEvent("wasd:toast", {
                detail: {
                  type: "success",
                  message: "Character created",
                },
              }));
            } else {
              setStatus(`Failed: ${result.error ?? result.result?.reason ?? "unknown"}`);
            }
          } catch (err) {
            setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }}
      >
        Create Character
      </button>

      {status && <p className="character-form-status">{status}</p>}
    </section>
  );
}