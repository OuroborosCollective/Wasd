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

const START_PATHS = [
  "wanderer",
  "forager",
  "miner",
  "angler",
  "artisan",
] as const;

type StartPath = (typeof START_PATHS)[number];

const START_PATH_LABELS: Record<StartPath, string> = {
  wanderer: "Wanderer — neutraler Start",
  forager: "Forager — Sammeln-Tutorial",
  miner: "Miner — Erz & Spitzhacke",
  angler: "Angler — Wasser & Angel",
  artisan: "Artisan — Werkbank & Crafting",
};

interface Props {
  onCreated?: () => void;
}

export function CharacterSelectPanel({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [startPath, setStartPath] = useState<StartPath>("wanderer");
  const [status, setStatus] = useState<string>("");

  return (
    <section data-testid="character-select" className="are-window character-select-panel">
      <h2>Character Creation</h2>
      <p>
        Erstelle deinen ersten Areloria-Charakter. Areloria ist klassenlos: Skills wachsen durch Nutzung,
        nicht durch eine feste Klasse.
      </p>

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
        Startpfad
        <select
          value={startPath}
          onChange={(event) => setStartPath(event.target.value as StartPath)}
          className="character-form-select"
        >
          {START_PATHS.map((id) => (
            <option key={id} value={id}>
              {START_PATH_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <p className="character-form-hint">
        Keine Klasse, keine Sperren: Der Startpfad bestimmt nur Startausrüstung und Tutorial-Fokus.
        Danach kannst du alle Skills frei trainieren.
      </p>

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
                archetype: startPath,
                currentTick: 0,
              }),
            });

            const contentType = response.headers.get("content-type") ?? "";
            const result = contentType.includes("application/json")
              ? await response.json()
              : { ok: false, error: `Server returned non-JSON response (${response.status})` };

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
