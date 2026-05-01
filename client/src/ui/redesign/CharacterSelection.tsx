import React, { useState } from "react";
import "./CharacterSelection.css";

interface Character {
  id: string;
  name: string;
  class: "Warrior" | "Mage" | "Rogue";
  level: number;
  image: string;
}

interface CharacterSelectionProps {
  onCharacterSelected: (charName: string) => void;
}

const mockCharacters: Character[] = [
  { id: "1", name: "Eldrin", class: "Mage", level: 30, image: "✨" },
  { id: "2", name: "Lyra", class: "Rogue", level: 25, image: "🗡️" },
];

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({ onCharacterSelected }) => {
  const [selectedChar, setSelectedChar] = useState<Character | null>(mockCharacters[0]);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="char-selection-container">
      <div className="selection-overlay">
        <div className="selection-card">
          <header className="selection-header">
            <h1 className="gold-text" style={{fontSize: "40px"}}>Arelorian</h1>
            <p style={{letterSpacing: "4px"}}>- Select Your Hero -</p>
          </header>

          <main className="selection-content">
            <div className="char-list" role="radiogroup" aria-label="Select a character">
              {mockCharacters.map((char) => (
                <div 
                  key={char.id} 
                  className={`char-item ${selectedChar?.id === char.id ? "active" : ""}`}
                  onClick={() => setSelectedChar(char)}
                  onKeyDown={(e) => handleKeyDown(e, () => setSelectedChar(char))}
                  role="radio"
                  tabIndex={0}
                  aria-checked={selectedChar?.id === char.id}
                  aria-label={`${char.name}, ${char.class} Level ${char.level}`}
                >
                  <div className="char-avatar">
                    <span style={{fontSize: "24px"}} aria-hidden="true">{char.image}</span>
                  </div>
                  <div className="char-info">
                    <span className="char-name">{char.name}</span>
                    <span className="char-meta">{char.class} - Level {char.level}</span>
                  </div>
                </div>
              ))}
              <div
                className="char-item new"
                role="button"
                tabIndex={0}
                onClick={() => {}} // Placeholder for new char creation
                onKeyDown={(e) => handleKeyDown(e, () => {})}
                aria-label="Create New Character"
              >
                <div className="char-avatar plus" aria-hidden="true">+</div>
                <div className="char-info">
                  <span className="char-name">New Character</span>
                </div>
              </div>
            </div>

            <div className="char-preview">
              {selectedChar && (
                <>
                  <div className="char-full-render">
                    <div className="render-placeholder" style={{fontSize: "150px"}}>
                        {selectedChar.class === "Mage" ? "🧙" : "🥷"}
                    </div>
                  </div>
                  <div className="char-details">
                    <h2 className="gold-text" style={{fontSize: "36px", marginBottom: "5px"}}>{selectedChar.name}</h2>
                    <div className="class-badge">{selectedChar.class}</div>
                    <div className="stats-preview">
                      <div className="stat-preview-item">
                        <label id="stat-str">Strength</label>
                        <div
                          className="stat-preview-bar"
                          role="progressbar"
                          aria-labelledby="stat-str"
                          aria-valuenow={70}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div style={{width: "70%"}}></div>
                        </div>
                      </div>
                      <div className="stat-preview-item">
                        <label id="stat-agi">Agility</label>
                        <div
                          className="stat-preview-bar"
                          role="progressbar"
                          aria-labelledby="stat-agi"
                          aria-valuenow={40}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div style={{width: "40%"}}></div>
                        </div>
                      </div>
                      <div className="stat-preview-item">
                        <label id="stat-int">Intelligence</label>
                        <div
                          className="stat-preview-bar"
                          role="progressbar"
                          aria-labelledby="stat-int"
                          aria-valuenow={90}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div style={{width: "90%"}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>

          <footer className="selection-footer">
            <button className="back-btn" onClick={() => window.location.reload()}>LOGOUT</button>
            <button 
              className="begin-btn" 
              onClick={() => selectedChar && onCharacterSelected(selectedChar.name)}
              disabled={!selectedChar}
            >
              BEGIN JOURNEY
            </button>
            <button className="options-btn">OPTIONS</button>
          </footer>
        </div>
      </div>
    </div>
  );
};
