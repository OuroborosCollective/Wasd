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
    label: "Wanderer — neutraler Start",
    shortLabel: "Wanderer",
    starterKit: ["Reiseration", "Trainingsspeer", "Wegmarke"],
    tutorialFocus: "Bewegen, NPC ansprechen, erste Quest, erster Kampf.",
    firstResourceSpot: "Dorfplatz, Übungsfeld und erster NPC am Wegstein.",
    firstGoal: "Sprich mit dem ersten NPC und sichere den Außenposten.",
  },
  forager: {
    label: "Forager — Sammeln-Tutorial",
    shortLabel: "Forager",
    starterKit: ["Sammelbeutel", "Kräutermesser", "Feldnotiz"],
    tutorialFocus: "Kräuter, Beeren, Pilze und einfache Naturmaterialien finden.",
    firstResourceSpot: "Kräuterwiese am Waldrand mit Foraging-Knoten.",
    firstGoal: "Sammle 3 Kräuter und bringe sie zur Vorratskiste.",
  },
  miner: {
    label: "Miner — Erz & Spitzhacke",
    shortLabel: "Miner",
    starterKit: ["Einfache Spitzhacke", "Erzbeutel", "Kupfermarke"],
    tutorialFocus: "Stein, Kupfer, Erzadern und robuste Materialien abbauen.",
    firstResourceSpot: "Felsnase nördlich des Starts mit Stein- und Kupferadern.",
    firstGoal: "Baue 3 Kupfererz ab und prüfe den ersten Schmelzauftrag.",
  },
  angler: {
    label: "Angler — Wasser & Angel",
    shortLabel: "Angler",
    starterKit: ["Einfache Angel", "Köderbeutel", "Kleines Netz"],
    tutorialFocus: "Fishing-Spots erkennen, Fisch fangen und später Kochen lernen.",
    firstResourceSpot: "Ufersteg am nahen Wasser mit markiertem Fishing-Spot.",
    firstGoal: "Fange 3 Fische und bereite den ersten Kochauftrag vor.",
  },
  artisan: {
    label: "Artisan — Werkbank & Crafting",
    shortLabel: "Artisan",
    starterKit: ["Werkzeugrolle", "Holzplanke", "Rezeptkarte"],
    tutorialFocus: "Werkbank, erste Rezepte, einfache Verarbeitung und Reparatur.",
    firstResourceSpot: "Werkbank-Zelt beim Startlager mit Crafting-Auftrag.",
    firstGoal: "Fertige eine Holzplanke oder repariere ein einfaches Werkzeug.",
  },
};

interface Props {
  onCreated?: () => void;
}

export function CharacterSelectPanel({ onCreated }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [startPath, setStartPath] = useState<StartPath>("wanderer");
  const [status, setStatus] = useState<string>("");
  const selectedPath = START_PATH_INFO[startPath];

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
              {START_PATH_INFO[id].label}
            </option>
          ))}
        </select>
      </label>

      <article className="character-start-path-card" data-testid="character-start-path-card">
        <header>
          <strong>{selectedPath.shortLabel}</strong>
          <span>Startpfad · keine Klasse</span>
        </header>
        <dl>
          <div>
            <dt>Starter-Kit</dt>
            <dd>{selectedPath.starterKit.join(" · ")}</dd>
          </div>
          <div>
            <dt>Tutorial-Fokus</dt>
            <dd>{selectedPath.tutorialFocus}</dd>
          </div>
          <div>
            <dt>Erster Ressourcen-Spot</dt>
            <dd>{selectedPath.firstResourceSpot}</dd>
          </div>
          <div>
            <dt>Erstes Ziel</dt>
            <dd>{selectedPath.firstGoal}</dd>
          </div>
        </dl>
      </article>

      <p className="character-form-hint">
        Keine Klasse, keine Sperren: Der Startpfad bestimmt nur Startausrüstung, Tutorial-Fokus und den ersten
        Ressourcen-Spot. Danach kannst du alle Skills frei trainieren.
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
