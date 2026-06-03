import React, { useState } from "react";
import type { ClientCharacterSummary } from "../identity/characterSelection";

interface Props {
  open: boolean;
  characters: ClientCharacterSummary[];
  selectedCharacterId: string | null;
  onSelect: (characterId: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function CharacterSelectPanel({
  open,
  characters,
  selectedCharacterId,
  onSelect,
  onCreate,
  onClose
}: Props) {
  const [name, setName] = useState("Adventurer");

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        display: "grid",
        placeItems: "center",
        padding: 18,
        background: "rgba(0,0,0,.58)",
        color: "#f5f7ff"
      }}
    >
      <div
        style={{
          width: "min(620px, 94vw)",
          padding: 18,
          borderRadius: 22,
          border: "1px solid rgba(0,229,255,.28)",
          background: "rgba(7,7,17,.96)",
          backdropFilter: "blur(14px)"
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Character Select [P7]</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 16 }}>✕</button>
        </header>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {characters.length === 0 ? (
            <div style={{ opacity: 0.65 }}>Noch kein Character vorhanden.</div>
          ) : (
            characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => onSelect(character.id)}
                style={{
                  padding: 12,
                  textAlign: "left",
                  borderRadius: 14,
                  border:
                    character.id === selectedCharacterId
                      ? "1px solid rgba(57,255,20,.5)"
                      : "1px solid rgba(255,255,255,.12)",
                  background:
                    character.id === selectedCharacterId
                      ? "rgba(57,255,20,.12)"
                      : "rgba(255,255,255,.06)",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <strong>{character.name}</strong>
                <div style={{ opacity: 0.65 }}>
                  {character.sceneId} · Level {character.level ?? 1}
                </div>
              </button>
            ))
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            const clean = name.trim().slice(0, 24);
            if (clean.length > 0) onCreate(clean);
          }}
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={24}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(255,255,255,.08)",
              color: "#fff"
            }}
          />
          <button type="submit" style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#00e5ff", color: "#000", cursor: "pointer" }}>Create</button>
        </form>
      </div>
    </div>
  );
}