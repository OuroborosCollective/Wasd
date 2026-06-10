# ARE Erdős-Attraktor-Modell (Ω_E)

## Phase 8-10 Architektur

Das World Brain organisiert die 13 Logikpunkte deterministisch durch **kausale Resonanz** auf dem 64.000 × 64.000 Kappa-Grid. Keine externen AI-Impulse – 100% emergent.

---

## Die 13 Logikpunkte (Rekursive Chunk-Datenschichten)

Jeder Chunk enthält aggregierte Zustands-Deltas für diese Schichten:

| # | Logikpunkt | Beschreibung | Aggregat |
|---|------------|---------------|----------|
| 1 | **Ökologie & Ressourcen** | Naturzustand, Regeneration | `resource_density: Kappa` |
| 2 | **Ökonomie & Markt** | Lokale Preise, Angebot/Nachfrage | `price_index: Kappa` |
| 3 | **NPC-Wachstum & Physiologie** | Energie/Gesundheit Population | `npc_vitality: Kappa` |
| 4 | **Handel & Logistik** | Routen-Attraktivität, Transport | `trade_attractiveness: Kappa` |
| 5 | **Soziales Gedächtnis** | Local Memory / Reputation | `social_memory: Kappa` |
| 6 | **Politik & Fraktionen** | Territorialer Einfluss | `political_influence: Kappa` |
| 7 | **Aggression & Konflikt** | Warfront-Spikes | `aggression_spike: Kappa` |
| 8 | **Wirtschaftliche Konjunktur** | Strukturaufbau, Wachstum | `economic_cycle: Kappa` |
| 9 | **Königreiche & Makro-Territorien** | Strategischer Wert | `kingdom_value: Kappa` |
| 10 | **Glaube & Kult** | Ideologische Fraktions-Spannungen | `faith_tension: Kappa` |
| 11 | **Dungeon & Gefahr** | Monster-Spawn-Wahrscheinlichkeit | `danger_probability: Kappa` |
| 12 | **Angst & Moral** | Lokales NPC-Sicherheitsbedürfnis | `fear_index: Kappa` |
| 13 | **Wiederauferstehung & Zyklen** | Deterministischer Ressourcencycle | `resurrection_cycle: Kappa` |

---

## Ω_E (Erdős-Attraktor) Definition

```
Ω_E = lim(n→∞) (Σ_{i=1}^{13} w_i × Ψ_i(chunk_n)) / Σ w_i

wobei:
- Ψ_i = Wavefunction des i-ten Logikpunkts
- w_i = Gewichtung (basierend auf Aktivität)
- chunk_n = n-ter Chunk im Resonanzfeld
```

### Stabilisierungs-Mechanismus

In einem geschlossenen, rekursiven Informationsfeld (∑ ARE = const) kollabieren komplexe Netzwerke **nicht ins Chaos**. Sie stabilisieren sich durch die 10-Hz-Taktung mathematisch um vordefinierte Attraktoren (Erdős-Knoten).

### Attraktor-Zustände

| Attraktor | Auslöser | Resultat |
|-----------|----------|----------|
| `village_to_city` | trade_attractiveness > threshold | Dorf wird zur Stadt |
| `aggression_spike_sector_47` | aggression_index > threshold | Konflikt in Sektor 47 |
| `market_collapse` | price_index destabilizes | Markt-Kollaps |
| `cult_formation` | faith_tension converges | Kult-Entstehung |
| `dungeon_emergence` | danger_probability > 0.8 | Dungeon spawnt |

---

## Phase 8: Snapshot Composer (13-Layer Aggregation)

Der Centralized Snapshot aggregiert **Deltas der 13 Logikpunkte** aus dem 3×3 Chunk-Grid in den deterministischen WorldHash.

```typescript
interface ChunkLayerState {
  // Die 13 Logikpunkte als Kappa-Werte
  ecology: Kappa;           // Ökologie
  economy: Kappa;          // Markt
  npc_vitality: Kappa;       // Wachstum
  trade: Kappa;             // Logistik
  social_memory: Kappa;     // Reputation
  politics: Kappa;         // Fraktionen
  aggression: Kappa;        // Konflikt
  conjuncture: Kappa;       // Konjunktur
  kingdom: Kappa;           // Makro-Territorien
  faith: Kappa;             // Kult
  dungeon: Kappa;           // Gefahr
  fear: Kappa;              // Moral
  resurrection: Kappa;      // Zyklen
  
  // Aggregierte Delta zum previous state
  delta_hash: StateHash;
}

interface WorldBrainSnapshot {
  tick: TickId;
  active_chunks: ChunkKey[];
  layer_states: Map<ChunkKey, ChunkLayerState>;
  omega_e: OmegaAttractorState;
  world_hash: StateHash; // Enthält alle 13 Layer
}
```

---

## Phase 9: Write-Behind Persistence (Are-Erhaltung)

Die 13 Layer-Zustände werden **asynchron als ARE-Erhaltung** weggeschrieben:

```typescript
interface LayerPersistenceEvent {
  chunk_key: ChunkKey;
  layer_index: 1 | 2 | ... | 13;
  previous_state: ChunkLayerState;
  new_state: ChunkLayerState;
  delta_hash: StateHash;
  tick: TickId;
}

// Write-Behind Queue für deterministische Persistenz
class LayerWriteBehindQueue {
  enqueue(event: LayerPersistenceEvent): void;
  flush(): Promise<void>; // Asynchron, non-blocking
}
```

---

## Phase 10: World Brain Scheduler (Thin Shell)

Der `WorldTick` wird zum **extrem schlanken World Brain Scheduler**:

```typescript
class WorldBrainScheduler {
  // 10-Hz Taktung
  private TICK_INTERVAL_MS = 100;
  
  // Iteriert über aktive Chunks
  tick(): void {
    const activeChunks = this.getActiveChunks();
    
    for (const chunk of activeChunks) {
      // Evaluiert 13 Punkte deterministisch gegeneinander
      const evaluation = this.evaluateLayers(chunk);
      
      // Berechnet neuen Erdős-Attraktor-Zustand
      const attractor = this.computeOmegaE(evaluation);
      
      // Aggregiert in WorldHash
      this.updateWorldHash(chunk, attractor);
    }
    
    // OHNE tiefere Fachlogik selbst auszuführen
    // Die TickSystems führen die Logik aus, Brain koordiniert nur
  }
  
  private evaluateLayers(chunk: ChunkKey): LayerEvaluation {
    // Deterministische Evaluation aller 13 Punkte
  }
  
  private computeOmegaE(evaluation: LayerEvaluation): OmegaAttractor {
    // Berechnet Attraktor-Zustand
  }
}
```

---

## Resonanz-Regeln (KEINE KI-Blackboxes)

1. **Kausale Resonanz**: Änderungen in einem Logikpunkt propagiieren deterministisch zu verbundenen Punkten
2. **10-Hz Taktung**: Jeder Tick berechnet neue Resonanz-Zustände
3. **Deterministischer Kollaps**: Keine Wahrscheinlichkeit – nur fix-point Berechnung
4. **Keine externen Impulse**: ARE = const, keine AI/ML Inference

---

## Implementation Priority

1. **Phase 8**: `ChunkLayerState` Interface + `WorldBrainSnapshot`
2. **Phase 9**: `LayerWriteBehindQueue` für 13-Layer Persistenz
3. **Phase 10**: `WorldBrainScheduler` als dünne Hülle um TickSystemRegistry