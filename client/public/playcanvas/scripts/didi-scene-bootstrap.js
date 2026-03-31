var DidiSceneBootstrap = pc.createScript("didiSceneBootstrap");

// Optional server WebSocket URL. If empty, this script resolves from page URL.
DidiSceneBootstrap.attributes.add("wsUrl", {
    type: "string",
    default: "",
    title: "WebSocket URL"
});

// The default scene ID used by the server-side mapper.
DidiSceneBootstrap.attributes.add("sceneId", {
    type: "string",
    default: "didis_hub",
    title: "Scene ID"
});

// Initial spawn key for first login.
DidiSceneBootstrap.attributes.add("initialSpawnKey", {
    type: "string",
    default: "sp_player_default",
    title: "Initial Spawn Key"
});

DidiSceneBootstrap.prototype.initialize = function () {
    this.socket = null;
    this.localPlayerId = null;
    this.teleportMessage = null;

    // Shared helper for trigger scripts.
    var app = this.app;
    app._didiRequestSceneChange = this.requestSceneChange.bind(this);

    this.connect();
};

DidiSceneBootstrap.prototype.resolveWsUrl = function () {
    if (this.wsUrl && this.wsUrl.trim().length > 0) {
        return this.wsUrl.trim();
    }
    var protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    return protocol + window.location.host + "/ws";
};

DidiSceneBootstrap.prototype.connect = function () {
    var self = this;
    var url = this.resolveWsUrl();
    this.socket = new WebSocket(url);

    this.socket.onopen = function () {
        var token = window.localStorage.getItem("token") || undefined;
        self.socket.send(JSON.stringify({
            type: "login",
            token: token,
            sceneId: self.sceneId,
            spawnKey: self.initialSpawnKey
        }));
    };

    this.socket.onmessage = function (event) {
        var data;
        try {
            data = JSON.parse(event.data);
        } catch (err) {
            return;
        }

        if (data.type === "welcome") {
            self.localPlayerId = data.playerId || data.id || null;
            if (data.spawnPosition) {
                self.applySpawn(data.spawnPosition);
            }
            return;
        }

        if (data.type === "scene_changed" && data.spawnPosition) {
            self.applySpawn(data.spawnPosition);
            return;
        }

        if (data.type === "entity_sync" && Array.isArray(data.entities) && self.localPlayerId) {
            for (var i = 0; i < data.entities.length; i++) {
                var entity = data.entities[i];
                if (entity && entity.id === self.localPlayerId && entity.position) {
                    self.applySpawn(entity.position);
                    break;
                }
            }
        }
    };

    this.socket.onclose = function () {
        setTimeout(function () {
            self.connect();
        }, 2500);
    };
};

DidiSceneBootstrap.prototype.applySpawn = function (spawnPosition) {
    if (!spawnPosition) return;
    this.entity.setPosition(
        Number(spawnPosition.x || 0),
        Number(spawnPosition.y || 0),
        Number(spawnPosition.z || 0)
    );
};

DidiSceneBootstrap.prototype.requestSceneChange = function (sceneId, spawnKey) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return false;
    }
    this.socket.send(JSON.stringify({
        type: "scene_change",
        sceneId: sceneId || this.sceneId,
        spawnKey: spawnKey || "sp_player_default"
    }));
    return true;
};
