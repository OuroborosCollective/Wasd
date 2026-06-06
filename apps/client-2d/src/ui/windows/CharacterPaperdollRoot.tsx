// CharacterPaperdollRoot - Unified character/paperdoll root component
// Shows CharacterSelectPanel when no character exists, PaperdollPanel otherwise

import React from "react";
import type { LiveGameplaySnapshot } from "../../game/liveGameplaySnapshot";
import { CharacterSelectPanel } from "./CharacterSelectPanel";
import { PaperdollPanel } from "./PaperdollPanel";

interface Props {
  snapshot: LiveGameplaySnapshot;
  defaultOpen?: boolean;
}

export function CharacterPaperdollRoot({ snapshot, defaultOpen: _defaultOpen }: Props) {
  const hasCharacter = Boolean(snapshot.character);

  return (
    <div data-testid="character-paperdoll-root" className="character-paperdoll-root">
      {!hasCharacter ? (
        <CharacterSelectPanel
          hasCharacter={false}
          onCreated={() => {
            // Dispatch refresh event after character creation
            window.dispatchEvent(
              new CustomEvent("wasd:live-gameplay-refresh", {
                detail: { reason: "character-created" },
              }),
            );
          }}
        />
      ) : (
        <PaperdollPanel
          paperdoll={
            snapshot.paperdoll ?? {
              character: snapshot.character,
              slots: [],
            }
          }
        />
      )}
    </div>
  );
}