var DidiSceneTrigger = pc.createScript("didiSceneTrigger");

DidiSceneTrigger.attributes.add("targetSceneId", {
    type: "string",
    default: "didis_hub",
    title: "Target Scene ID"
});

DidiSceneTrigger.attributes.add("targetSpawnKey", {
    type: "string",
    default: "sp_didi_01",
    title: "Target Spawn Key"
});

DidiSceneTrigger.attributes.add("requiredTag", {
    type: "string",
    default: "player",
    title: "Required Entering Tag"
});

DidiSceneTrigger.attributes.add("enforceTag", {
    type: "boolean",
    default: false,
    title: "Enforce Required Tag"
});

DidiSceneTrigger.attributes.add("cooldownMs", {
    type: "number",
    default: 1500,
    title: "Cooldown (ms)"
});

DidiSceneTrigger.prototype.initialize = function () {
    this._nextAllowedAt = 0;
    this._onTriggerEnter = this.onTriggerEnter.bind(this);

    // PlayCanvas emits triggerenter on entities with collision + trigger enabled.
    this.entity.on("triggerenter", this._onTriggerEnter);

    if (!this.entity.collision) {
        console.warn("[didiSceneTrigger] Missing collision component on", this.entity.name);
    }
};

DidiSceneTrigger.prototype.postInitialize = function () {
    // Helpful runtime log for quick diagnosis on mobile.
    console.log("[didiSceneTrigger] active", {
        entity: this.entity.name,
        targetSceneId: this.targetSceneId,
        targetSpawnKey: this.targetSpawnKey
    });
};

DidiSceneTrigger.prototype.onTriggerEnter = function (otherEntity) {
    if (!otherEntity) return;

    if (this.enforceTag && this.requiredTag) {
        if (!otherEntity.tags || !otherEntity.tags.has(this.requiredTag)) {
            return;
        }
    }

    var now = Date.now();
    if (now < this._nextAllowedAt) {
        return;
    }
    this._nextAllowedAt = now + Math.max(0, this.cooldownMs | 0);

    this.requestSceneChange(this.targetSceneId, this.targetSpawnKey, otherEntity);
};

DidiSceneTrigger.prototype.requestSceneChange = function (sceneId, spawnKey, sourceEntity) {
    if (typeof window !== "undefined" && typeof window.requestSceneChange === "function") {
        window.requestSceneChange(sceneId, spawnKey);
        return;
    }

    // Fallback event bus hook if global bridge is not available.
    this.app.fire("didi:scene:change", {
        sceneId: sceneId,
        spawnKey: spawnKey,
        sourceEntity: sourceEntity ? sourceEntity.name : null
    });

    console.warn(
        "[didiSceneTrigger] window.requestSceneChange missing. Fired app event didi:scene:change instead.",
        { sceneId: sceneId, spawnKey: spawnKey }
    );
};

DidiSceneTrigger.prototype.destroy = function () {
    this.entity.off("triggerenter", this._onTriggerEnter);
};
