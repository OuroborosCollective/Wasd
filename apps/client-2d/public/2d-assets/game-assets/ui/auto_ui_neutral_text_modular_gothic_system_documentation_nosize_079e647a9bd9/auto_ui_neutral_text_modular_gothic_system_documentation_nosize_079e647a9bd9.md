# Eldritch Modular Gothic: System-Dokumentation & Integrations-Guide

Diese Dokumentation dient als Master-Referenz für das „Eldritch Modular Gothic“-Asset-Paket von arelorian.de. Es kombiniert die düstere Ästhetik von Diablo 4 mit der plakativen, modularen Lesbarkeit von Borderlands.

---

## 1. Symbol-Katalog & Semantik

### A. Item-Raritäten (Rarity)
| Typ | Visuelle Charakteristik | Bedeutung |
| :--- | :--- | :--- |
| **Common** | {{DATA:IMAGE:IMAGE_33}} Grauer Stein-Look | Standard-Gegenstände, hohe Drop-Rate. |
| **Magic** | {{DATA:IMAGE:IMAGE_27}} Blaues Glühen | Einfache magische Modifikatoren. |
| **Rare** | {{DATA:IMAGE:IMAGE_45}} Gelbes Schimmern | Seltene Gegenstände mit mehreren Affixen. |
| **Epic** | {{DATA:IMAGE:IMAGE_38}} Violette Aura | Hochwertige Ausrüstung mit starken Stats. |
| **Legendary** | {{DATA:IMAGE:IMAGE_49}} Orangefarbenes Feuer | Mächtige Artefakte mit Spezialeffekten. |
| **Mythic** | {{DATA:IMAGE:IMAGE_17}} Rotes Pulsieren | Absolute End-Game-Gegenstände. |

### B. Affixe & Stats (Mechanik)
*   **Kern-Stats:** {{DATA:IMAGE:IMAGE_24}} Stärke (Rot), {{DATA:IMAGE:IMAGE_57}} Agilität (Grün), {{DATA:IMAGE:IMAGE_20}} Intelligenz (Lila).
*   **Defensiv:** {{DATA:IMAGE:IMAGE_61}} Verteidigung, {{DATA:IMAGE:IMAGE_52}} Blockchance, {{DATA:IMAGE:IMAGE_6}} Ausweichen.
*   **Resistenzen:** {{DATA:IMAGE:IMAGE_19}} Feuer, {{DATA:IMAGE:IMAGE_29}} Eis, {{DATA:IMAGE:IMAGE_8}} Blitz.
*   **Utility:** {{DATA:IMAGE:IMAGE_15}} Mana, {{DATA:IMAGE:IMAGE_65}} Leben, {{DATA:IMAGE:IMAGE_23}} Glück, {{DATA:IMAGE:IMAGE_4}} Tempo.
*   **Kampf-Effekte:** {{DATA:IMAGE:IMAGE_41}} Crit-Chance, {{DATA:IMAGE:IMAGE_36}} Crit-Schaden, {{DATA:IMAGE:IMAGE_18}} AoE, {{DATA:IMAGE:IMAGE_55}} Vampirismus, {{DATA:IMAGE:IMAGE_31}} Cooldown.

### C. Monster-Gattungen (Bestiarium)
*   **Klassisch:** {{DATA:IMAGE:IMAGE_13}} Humanoide, {{DATA:IMAGE:IMAGE_44}} Tiere, {{DATA:IMAGE:IMAGE_16}} Reptilien, {{DATA:IMAGE:IMAGE_9}} Kobolde.
*   **Metaphysisch:** {{DATA:IMAGE:IMAGE_56}} Feen, {{DATA:IMAGE:IMAGE_26}} Elementare, {{DATA:IMAGE:IMAGE_37}} Engel, {{DATA:IMAGE:IMAGE_63}} Dämonen.
*   **Anomalien:** {{DATA:IMAGE:IMAGE_14}} Psi-Brains, {{DATA:IMAGE:IMAGE_59}} Holowesen, {{DATA:IMAGE:IMAGE_40}} Aliens, {{DATA:IMAGE:IMAGE_21}} Sekrete.
*   **Technologisch:** {{DATA:IMAGE:IMAGE_67}} Maschinen, {{DATA:IMAGE:IMAGE_28}} AI/KI.
*   **Physikalisch:** {{DATA:IMAGE:IMAGE_25}} Schwerkraft/Physik.

### D. Welt & Diplomatie
*   **Fraktionen:** {{DATA:IMAGE:IMAGE_35}} Faction 1, {{DATA:IMAGE:IMAGE_12}} Faction 2, {{DATA:IMAGE:IMAGE_46}} Faction 3.
*   **Soziales:** {{DATA:IMAGE:IMAGE_22}} Trust Badge (Handshake).
*   **Stimmungen:** {{DATA:IMAGE:IMAGE_64}} Happy, {{DATA:IMAGE:IMAGE_34}} Neutral, {{DATA:IMAGE:IMAGE_30}} Sad, {{DATA:IMAGE:IMAGE_39}} Angry, {{DATA:IMAGE:IMAGE_66}} Crazy.
*   **Staatswesen:** {{DATA:IMAGE:IMAGE_42}} Kingdom Crests, {{DATA:IMAGE:IMAGE_51}} Land-Marker.
*   **Militär:** {{DATA:IMAGE:IMAGE_68}} Soldat, {{DATA:IMAGE:IMAGE_54}} Offizier, {{DATA:IMAGE:IMAGE_7}} NPC-Rang.

---

## 2. Technische Integration (Pixi.js & TSX)

### Pixi.js Rendering-Strategie
Da alle Symbole als hochauflösende SVGs/PNGs mit fetten Outlines vorliegen, ist die Skalierbarkeit exzellent.

1.  **Texture Loading:** Nutze den `Assets`-Manager von Pixi.js.
    ```typescript
    const texture = await Assets.load('{{DATA:IMAGE:IMAGE_24}}');
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    ```
2.  **Modularer Sprite-Generator:** Erstelle eine Factory-Funktion, die Symbole basierend auf Affix-Typen zurückgibt.
3.  **Outline-Handling:** Da die Outlines Teil der Textur sind, ist kein zusätzlicher Shader für "Borderlands-Style" nötig. Für Hover-Effekte empfiehlt sich ein `GlowFilter` (pixi-filters).

### TSX / React Integration
Verwende eine dynamische `Icon`-Komponente für das UI-Overlay.

```tsx
interface IconProps {
  type: AffixType;
  size?: number;
  glow?: boolean;
}

export const ArelorianIcon: React.FC<IconProps> = ({ type, size = 32, glow }) => {
  const src = getPlaceholderByAffixType(type);
  return (
    <div className={`relative flex items-center justify-center`} style={{ width: size, height: size }}>
      <img src={src} className="w-full h-full object-contain drop-shadow-md" />
      {glow && <div className="absolute inset-0 bg-primary/20 blur-lg animate-pulse" />}
    </div>
  );
};
```

---

## 3. Best Practices für Agenten & Tools

### Asset-Management & Clipping
*   **Crop-Regel:** Alle Icons sind zentriert mit einem minimalen Padding von 5% zum Rand exportiert. Dies verhindert das Abschneiden der dicken Outlines bei Rundungen.
*   **Farb-Mapping:** Nutze die Design-Token aus {{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}}. Affixe sollten farblich kodiert sein (Stärke = Rot, Mana = Blau).
*   **Layering:** In Pixi.js sollten Raritäts-Hintergründe (z.B. {{DATA:IMAGE:IMAGE_49}}) in einem Layer *unter* dem Item-Sprite liegen.

### Design-Tipps für UI-Integration
*   **Kontrast:** Die Symbole funktionieren am besten auf dunklen Hintergründen (`surface-container-low` #171b2a).
*   **Interaktion:** Bei Hover sollte das Icon leicht skalieren (`scale(1.1)`) und ein farblich passendes Glühen (glow) aktivieren.
*   **Konsistenz:** Mische niemals Icons ohne Outline mit diesem Set. Die visuelle Integrität bricht sofort, wenn die Borderlands-Outlines fehlen.
