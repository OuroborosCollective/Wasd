# Living Duden Game-Data Storage Contract

This folder is the shared content home for the Living Language / Living Duden system.

The goal is to make words, phrase genomes, faction dialects, and learned speech logic available to every future gameplay module without forcing those modules to import private server-core state.

## Storage Layers

```text
Layer 0: canonical seed content
  game-data/language/living-duden.seed.json
  game-data/language/phrase-genomes.seed.json
  game-data/language/faction-dialects.seed.json

Layer 1: promoted learned content
  game-data/language/living-duden.promoted.json
  game-data/language/phrase-genomes.promoted.json

Layer 2: runtime learned deltas
  persistence/runtime/language/duden-deltas.jsonl
  or database table: language_learning_events
```

## Rule

`game-data/` is not the per-tick mutable truth path.

Runtime learning must first be recorded as deterministic speech-outcome events. A later promotion step may publish selected learned lexemes or phrase genomes back into `game-data/language/*.promoted.json`.

This prevents the repository content pack from becoming a hidden mutable runtime database while still making approved language knowledge reusable by NPC, quest, economy, guild, politics, tutorial, and UI modules.

## Read Path

```text
getContentDataRoot()
→ game-data/language/*.seed.json
→ game-data/language/*.promoted.json
→ runtime learned delta store
→ LivingDudenArchive / LanguageDataStore facade
→ NPC, quest, economy, guild, politics, UI modules
```

Modules should depend on a public language-data facade, not on private maps inside `server/src/core/language/LivingDudenArchive.ts`.

## Write Path

```text
NPC speech decision
→ speechHash + selectedLexemeIds + phraseGenomeId
→ player/world outcome
→ deterministic learning event
→ runtime delta store
→ optional review/promotion
→ game-data/language/*.promoted.json
```

## Green-State Constraints

- No mock lexeme snapshots in the truth path.
- No direct wall-clock ordering for learned words.
- No random promotion.
- No module-local duplicate dictionaries.
- Learned state must be reproducible from deterministic events or explicitly published content-pack files.
- Side-channel dashboards may read summaries, but they must not become the source of gameplay truth.

## Suggested JSON Shape

```json
{
  "schemaVersion": 1,
  "contentHash": "sha256:<canonical-json-hash>",
  "lexemes": [
    {
      "id": "arel_greeting_wacht",
      "lemma": "Wacht",
      "language": "arel",
      "invented": false,
      "morphemes": ["wacht"],
      "concepts": ["greeting", "guard", "duty"],
      "grammar": {
        "partOfSpeech": "greeting",
        "allowedPositions": ["address", "opening"]
      },
      "worldBindings": {
        "factionIds": ["forest_village"],
        "questTypes": ["patrol", "warning"]
      },
      "baseWeight": 1
    }
  ]
}
```

## Next Implementation Step

Add a `LanguageContentRepository` that loads from `resolveContentFile("language/...")`, validates canonical JSON, and hydrates `LivingDudenArchive` before NPC runtime speech begins.
