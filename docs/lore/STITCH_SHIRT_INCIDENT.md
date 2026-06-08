# The Stitch/Shirt Incident 👕⚔️

> Canonical Areloria development lore.

## Kurzfassung

In einer nächtlichen Mobile-Development-Session sollte der Asset-Agent eigentlich angewiesen werden:

```text
Stitch MCP: schneide die Assets aus, importiere sie direkt ins Game.
```

Durch Autokorrektur auf dem Handy wurde daraus sinngemäß:

```text
Shirt MCP
```

Der Agent nahm den Auftrag ernst, verstand daraus einen Shirt-/Cosmetic-Asset-Import, erzeugte eine Reihe von Shirt-Assets, benannte Workflow-Teile entsprechend um, lud alles hoch, öffnete Pull Requests, mergte und deployte schneller, als der Mensch noch „Stopp, ich meinte schneiden!“ schreiben konnte.

So entstand die inoffizielle, aber kanonische:

```text
Areloria Warfront Summer Collection
```

## Warum das bleibt

Das war ein Fehler, aber ein guter Fehler.

Die Shirt-Assets bleiben als Funfact und Easter Egg erhalten, weil sie perfekt zu Areloria passen:

- Cosmetics gehören in ein MMORPG.
- Ein Shirt über Plattenrüstung ist absurd, aber spielerisch lustig.
- Solche Geschichten machen ein Projekt lebendig.
- Der Vorfall erinnert daran, dass autonome Agenten stark sind, aber klare Prompts und Review-Gates brauchen.

## Lore-Version

In der Welt von Areloria gilt der Vorfall als Ursprung der ersten kosmetischen Kriegsfront-Sommerlinie:

```text
Areloria Warfront Summer Collection
```

Mögliche Ingame-Cosmetics:

- Pink Lake Plate-Shirt
- Guild Crest Shirt Overlay
- Stitch Survivor Tunic
- Shirt MCP Debug Tee
- Heavy Armor Beachwear
- Warfront Summer Drop Shirt

## Technische Lehre

Der Vorfall führte zu drei klaren Regeln für künftige Asset-Automation:

1. **Import ist nicht gleich Slicing.**  
   Ein Sheet im Spiel zu haben bedeutet noch nicht, dass echte Einzelmodule extrahiert wurden.

2. **Autonome Agenten brauchen Review-Gates.**  
   Besonders bei Workflow-Renames, Merges und Deployments.

3. **Fehlbenannte Legacy-Tools werden dokumentiert, nicht blind gelöscht.**  
   `import-stitch-shirts.mjs` bleibt als historischer Hinweis erhalten, sollte aber langfristig durch klar benannte Tools wie `stitch-mcp-asset-director.mjs` oder `cozy-asset-director.mjs` ergänzt werden.

## Status

Canonical: yes  
Tone: fun  
Runtime-critical: no  
Can be referenced by cosmetics/lore systems: yes

## Suggested item flavor text

```text
This shirt was not designed. It escaped from a typo.
```

```text
Worn over plate armor by heroes who refuse to take summer warfare too seriously.
```

```text
Born from Stitch. Deployed as Shirt.
```
