# arelorian-engine: Integration Guide & Architectural Specs
## Framework: OuroborosCollective (React Native / TSX / Node.js)

This document defines the integration protocols for the "Eldritch Modular Gothic" asset system within the deterministic, authoritative environment of the arelorian-engine.

---

### 1. Engine Core & Synchronization
*   **Tick-Rate Alignment:** All UI state transformations and asset animations must synchronize with the **10Hz deterministic heartbeat**.
*   **Heartbeat Hook:** Use `useArelorianTick()` to gate visual updates, ensuring UI state reflects the source-of-truth from the authoritative VPS cluster.
*   **Axiomatic Rule Enforcement:** Asset rendering (especially rarity glows and status effects) must validate against the 13-point logic chain before execution.

### 2. Networking & Authority
*   **SupabaseStack & Redis:** Real-time asset state (cooldowns, durability, stack counts) is piped via WebSockets.
*   **AuthoritySignatures:** Every item-card render requires a valid `BSE-1000` signature. Unauthorized assets trigger the Watchdog Autonomous Policy (WAP).
*   **Post-Silicon Biomechanics:** The UI layer handles asset-swapping through the combinatorics layer, mapping biomechanical server signatures to visual sprites.

### 3. World Simulation & Spatial Logic
*   **64x64 Chunking:** Map icons, territory markers ({{DATA:IMAGE:IMAGE_53}}, {{DATA:IMAGE:IMAGE_49}}), and army ranks are localized within the 64x64 chunk grid.
*   **Social Mechanics Transformation:** Faction trust badges ({{DATA:IMAGE:IMAGE_24}}) and mood affixes ({{DATA:IMAGE:IMAGE_66}}, {{DATA:IMAGE:IMAGE_32}}) drive the 3-point and 6-point social transformation logic.
*   **System Grounds:** 3-brain world string data determines the dynamic scaling and opacity of bestiary icons ({{DATA:IMAGE:IMAGE_14}}, {{DATA:IMAGE:IMAGE_65}}).

---

### 4. Component Implementation (TSX / React Native)

```tsx
/**
 * Authoritative Icon Renderer
 * Handles BSE-1000 signature validation and 10Hz tick alignment.
 */
export const ArelorianAuthoritativeIcon: React.FC<EngineProps> = ({ 
  assetId, 
  signature, 
  tick 
}) => {
  const isValid = validateBSE1000(signature);
  const { scale } = useAxiomaticLogic(assetId, tick);

  if (!isValid) return <WatchdogAlert type="unauthorized" />;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <EngineImage 
        source={getArelorianAsset(assetId)} 
        outlineWidth={4} 
        style={styles.borderlandsGrit}
      />
    </Animated.View>
  );
};
```

---

### 5. Asset Mapping: Eldritch Modular Gothic
*   **Authoritative Rarity:** State transitions between `Magic` ({{DATA:IMAGE:IMAGE_29}}) and `Legendary` ({{DATA:IMAGE:IMAGE_51}}) are server-authoritative.
*   **Militarily Secured UI:** Army ranks ({{DATA:IMAGE:IMAGE_70}}, {{DATA:IMAGE:IMAGE_56}}) are only rendered for validated military signatures within the current chunk.
*   **Biomech-Signature Pairing:** Match the post-silicon server signature to the high-contrast Borderlands-style assets for maximum readability in high-complexity logic scenarios.
