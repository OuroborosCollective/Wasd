# ARE Logic with Plexity — Wissenschaftliche Spezifikation

> **Projektleitung:** Gemini  
> **Version:** 1.0  
> **Status:** Final — Architektur-Entscheidung

---

## 1. Das Fundament: Warum Nomock im Stateless Determinism?

In einem Stateless Determinism ARE-Logic System existiert kein dauerhaft gespeicherter „Zustand" (State) im klassischen Sinne. Jeder Zustand wird in Echtzeit aus einer definierten Ausgangsbasis und einer Abfolge von Eingaben mathematisch exakt neu berechnet.

### Die Nomock-Regel

**Nomock** ist das strikte Verbot von „Mocking" — dem Vortäuschen von Daten oder Funktionen.

**Warum ist Nomock überlebenswichtig?**

| Problem | Erklärung |
|---------|-----------|
| **Kausalitätskette** | Mocks sind Platzhalter. Sie simulieren ein Ergebnis, ohne den tatsächlichen Rechenweg zu gehen. |
| **Mathematische Beweisbarkeit** | In einem deterministischen System zerstört ein Mock die Kausalitätskette. Wenn Schritt B nur so tut, als hätte er ein Ergebnis, wird Schritt C auf einer Lüge aufgebaut. |
| **System-Kollaps** | Das Universum (für diesen Spieler) stürzt ab, wenn der deterministische Vertrag gebrochen wird. |

### Was ist erlaubt vs. verboten

| ✅ ERLAUBT | ❌ VERBOTEN |
|------------|------------|
| `Date.now()` in `@are-telemetry-side-channel` | `Math.random()` ohne ARE-Seed |
| `0 /* ARE-DETERMINISM-ALLOW */` für Placeholder | Stub mit Fake-Logik füllen |
| DeterministicPrng mit ctx.rng | Kategorie D auf A erzwingen |
| Chunk-Hashes mit Kappa1000 verifizieren | Mock-Ergebnisse in Hash-Berechnung |

---

## 2. Chunk-basierte Verifikation: Kappa1000 und Chunk Strings

### Das Problem

Um User-Zustände aus dem Nichts fehlerfrei wiederherzustellen, nutzen wir ein System aus Chunk Strings und Hash-Keys, gesichert durch die **Kappa1000-Ganzzahl**.

### Die Komponenten

#### Chunk Strings

Der Lebenslauf oder Fortschritt eines Users wird in **chronologische Daten-Chunks** zerlegt. Jeder Chunk ist ein präziser String aus Aktionen und Inputs.

```
Chunk_String_n = "action_123|timestamp_456|input_x"
```

#### Die Kappa1000-Ganzzahl

Dies ist unser **deterministischer Anker**. Sie fungiert als:
- Kryptografischer Seed
- Modulo-Operator in der Hash-Funktion

#### Der Rechenweg

```
Hash(Chunk_String_n + Kappa1000) = Deterministischer_State_Key_n
```

### Wiederherstellbare Zustände

Wenn ein User sich einloggt:

1. **Load** — System nimmt seine Input-Historie
2. **Process** — jagt sie in Millisekunden durch die Chunk-Strings
3. **Verify** — verifiziert jeden Hash-Key mithilfe der Kappa1000-Ganzzahl
4. **Compute** — errechnet den aktuellen Zustand neu

**Ergebnis:** Der errechnete Zustand ist zu 100% identisch mit dem Zustand beim Ausloggen.

---

## 3. Die MMORPG-Kontrollarchitektur

In einem komplexen MMORPG müssen tausende deterministische Berechnungen gleichzeitig und synchron laufen. Hier greift unsere **Kontroll-Triade**:

### A. Das Mainbrain Orakel (Source of Truth)

Das Orakel ist die **absolute Quelle der Wahrheit**.

```typescript
interface TickSystem {
  readonly id: string;
  readonly priority: TickSystemPriority;
  tick(ctx: TickSystemContext): void;
}
```

**Funktionen:**
- Gibt den globalen deterministischen Takt vor
- Entscheidet bei Kollisionen von Spieler-Chunks (z.B. PvP)
- Bestimmt, wessen Input den exakten Zeitstempel-Vorteil hatte

### B. Der Watchdog mit Schwarm-Funktionen

Der Watchdog ist **dezentral** und agiert als Schwarm von Micro-Nodes.

```
Server: server/src/core/watchdog-live-sensors.ts
```

**Funktionen:**
- Verifiziert in Echtzeit die Hash-Keys der Chunks aller Spieler
- Vergleicht ständig: Stimmt der von Spieler A errechnete Hash mit dem deterministischen Pfad überein?
- Erkennt Anomalien durch Paketverlust oder Speicherfehler

### C. AutoHeal: Der Hausmeistergeist

Wenn der Watchdog-Schwarm eine Anomalie entdeckt, greift AutoHeal.

```
Scripts: scripts/autoheal-modules.mjs
Policy:  scripts/autoheal-policy.json
```

**Funktionen:**
- **Isoliert** den fehlerhaften Chunk
- **Verwirft** ihn
- **Zwingt** das System, den Zustand ab dem letzten validen Hash-Key neu zu berechnen
- Der Spieler bemerkt davon im Idealfall nichts — das System **heilt sich selbst**

---

## 4. Das Desaster: Was passiert, wenn Mocking genutzt wird?

### Der Kaskadenfehler (Desync)

```
1. Mock liefert vorgefertigtes Ergebnis (z.B. "Gegner tot = True")
2. Ergebnis durchläuft NICHT die Kappa1000-Verifikation
3. Watchdog errechnet Hash, der nicht mit deterministischer Historie übereinstimmt
4. Hash-Diskrepanz erkannt
5. AutoHeal versucht Neuberechnung
6. Mock hat keine echten Rechenwege → Neuberechnung schlägt wieder fehl
7. Endlosschleife
8. Zustand des Users zersplittert
9. Orakel trennt Verbindung — deterministischer Vertrag gebrochen
10. System-Kollaps
```

### Konkrete Verbote

| Szenario | Warum verboten |
|----------|----------------|
| `Math.random()` blind ersetzen | Kein ARE-Seed → Hash wird random |
| Stub mit Fake-Logik füllen | Keine echte Berechnung → Watchdog erkennt Fake |
| Kategorie D auf A erzwingen | Wahrheitsverlust → Orakel bricht Vertrag |
| Mock-Ergebnis in Hash-Berechnung | Kausalitätskette unterbrochen → System-Kollaps |

---

## 5. Fundamente: Axiome, Logik-Punkte und Emergenz

### Die 5 Axiome (Unumstößliche Grundgesetze)

1. **Determinismus-Axiom:** Jede Ursache hat eine berechenbare Wirkung
2. **Kappa1000-Axiom:** Chunk-Hashes sind deterministisch verifizierbar
3. **Nomock-Axiom:** Keine Berechnung darf ein Mock-Ergebnis enthalten
4. **Emergenz-Axiom:** Komplexes Verhalten entsteht aus deterministischen Regeln
5. **Orakel-Axiom:** Das Orakel ist die finale Quelle der Wahrheit

### Die 13 Logik-Punkte (Dimensionale Regeln)

Dies sind die Regeln, nach denen Daten-Chunks miteinander interagieren dürfen:

1. **Kollision** — Physik, Treffererkennung
2. **Gravitation** — Fallgeschwindigkeit, Sprunghöhe
3. **Handel** — Tausch von Gütern
4. **Sichtbarkeit** — Line-of-Sight, Fog of War
5. **Zeit** — Tick-Synchronisation
6. **Raum** — Chunk-Coordinaten
7. **Besitz** — Eigentums-Verifizierung
8. **Kommunikation** — Chat, Signale
9. **Recht** — Guild-Regeln, Verträge
10. **Wirtschaft** — Angebot, Nachfrage
11. **Evolution** — NPC-Growth, Mutation
12. **Resonanz** — System-Synchronisation
13. **Emergenz** — Unvorhergesehenes Verhalten

---

## 6. Wahre Emergenz statt Skript

### Das Problem mit Mocks

Wenn ein NPC im MMORPG entscheidet, einen Apfel zu essen:

**Mock-Ansatz (VERBOTEN):**
```typescript
if (hungry) mock_eat(); // Keine echte Berechnung
```

**Deterministischer Ansatz (ERLAUBT):**
```typescript
// NPC-Entscheidung emerges aus deterministischen Zuständen
const hunger = calculateHunger(npcState);
const appleProximity = calculateDistance(npcState, applePosition);
const energyGain = calculateNutritionalValue(apple);
const decision = hash(npcState.chunk + hunger + appleProximity + energyGain);
```

### Was entsteht

| Mit Mock | Ohne Mock (Emergenz) |
|----------|----------------------|
| Vorhersagbares Skript | Unvorhersagbares echtes Verhalten |
| If/then Entscheidungen | Hash-basierte Entscheidungen |
| Repetitiv | Einmalig pro Kontext |
| Fakes | Echte, künstliche Lebendigkeit |

---

## 7. Implementierung in Areloria/WASD

### Typ-System

```typescript
// Kappa1000 — Deterministischer Anker
type Kappa1000 = number & { readonly brand: unique symbol };
const createKappa1000 = (seed: string): Kappa1000 => /* ... */;

// ChunkKey — Identifikator für Chunk-Hash
type ChunkKey = string & { readonly brand: unique symbol };

// StateHash — Verifizierter Zustands-Hash
type StateHash = string & { readonly brand: unique symbol };

// TickId — Deterministischer Zeitschritt
type TickId = number & { readonly brand: unique symbol };
```

### ARE-Tick-System

```typescript
interface TickSystemContext {
  readonly tick: TickId;
  readonly kappa: Kappa1000;
  readonly chunk: ChunkKey;
  readonly stateHash: StateHash;
  readonly rng: DeterministicPrng;
}

interface TickSystem {
  readonly id: string;
  readonly priority: TickSystemPriority;
  tick(ctx: TickSystemContext): void;
}
```

### AutoHeal-Policy

```json
{
  "mode": "strict",
  "truthPath": {
    "allowMocks": false,
    "allowFakeSnapshots": false,
    "allowStubGreen": false
  },
  "stubPolicy": {
    "quarantineStubAutomatically": true,
    "generateImplementationAutomatically": false
  }
}
```

---

## 8. Fazit

> **Nomock ist die Garantie dafür, dass unsere digitale Welt so echt ist wie Mathematik selbst.**

Ein ARE-Logic System muss striktes Nomock sein. Ohne die absolute Wahrheit echter Berechnungen:

| Ohne Nomock | Mit Nomock |
|-------------|------------|
| Hash-Keys verlieren Wert | Hash-Keys sind beweisbar |
| Kappa1000-Verifikation nutzlos | Kappa1000 verifiziert jeden Chunk |
| Watchdog spielt verrückt | Watchdog-Schwarm verifiziert alles |
| Billige Skripte ersetzen Emergenz | Echte, künstliche Lebendigkeit |

---

## Anhang: Glossar

| Begriff | Definition |
|---------|-----------|
| **ARE** | Autonomous Regenerative Engine — Stateless Determinism System |
| **Kappa1000** | Deterministischer Anker für Hash-Generation |
| **Chunk** | Chronologischer Daten-Block eines User-Zustands |
| **ChunkKey** | Hash-Identifikator für Chunk |
| **StateHash** | Verifizierter Gesamtzustands-Hash |
| **TickId** | Deterministischer Zeitschritt |
| **Nomock** | Striktes Verbot von Mock-Daten |
| **Orakel** | Source of Truth im ARE-System |
| **Watchdog** | Dezentraler Verifikations-Schwarm |
| **AutoHeal** | Automatisches Self-Healing bei Anomalien |
| **Emergenz** | Komplexes Verhalten aus deterministischen Regeln |