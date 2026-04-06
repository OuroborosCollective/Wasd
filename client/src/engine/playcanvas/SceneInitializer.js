var SceneInitializer = pc.createScript('sceneInitializer');

// Attributes for root references
SceneInitializer.attributes.add('worldRoot', { type: 'entity' });
SceneInitializer.attributes.add('actorsRoot', { type: 'entity' });
SceneInitializer.attributes.add('lootRoot', { type: 'entity' });
SceneInitializer.attributes.add('uiRoot', { type: 'entity' });
SceneInitializer.attributes.add('networkRoot', { type: 'entity' });

SceneInitializer.prototype.initialize = function() {

    // 1. Create Roots if they don't exist
    this.worldRoot = this.getOrCreateEntity("WorldRoot", this.app.root);
    this.actorsRoot = this.getOrCreateEntity("ActorsRoot", this.worldRoot);
    this.lootRoot = this.getOrCreateEntity("LootRoot", this.worldRoot);
    this.uiRoot = this.getOrCreateEntity("UIRoot", this.app.root);
    this.networkRoot = this.getOrCreateEntity("NetworkRoot", this.app.root);

    // 2. Create Sub-Roots
    this.getOrCreateEntity("PlayersRoot", this.actorsRoot);
    this.getOrCreateEntity("NpcsRoot", this.actorsRoot);
    this.getOrCreateEntity("MonstersRoot", this.actorsRoot);
    this.getOrCreateEntity("ChunkRoot", this.worldRoot);

    // 3. Ensure Camera exists
    var camera = this.app.root.findByName("Camera");
    if (!camera) {
        camera = new pc.Entity("Camera");
        camera.addComponent("camera", {
            clearColor: new pc.Color(0.1, 0.1, 0.1)
        });
        this.app.root.addChild(camera);
        camera.setPosition(0, 10, 20);
        camera.lookAt(0, 0, 0);
    }

    // 4. Setup WebSocket Network
    this.setupNetwork();
};

SceneInitializer.prototype.getOrCreateEntity = function(name, parent) {
    var entity = parent.findByName(name);
    if (!entity) {
        entity = new pc.Entity(name);
        parent.addChild(entity);
    }
    return entity;
};

SceneInitializer.prototype.setupNetwork = function() {
    var self = this;
    var wsUrl = "wss://arelogic.space/ws";

    try {
        var socket = new WebSocket(wsUrl);

        socket.onopen = function() {
            socket.send(JSON.stringify({ type: "login", data: "PlayCanvasClient" }));
        };

        socket.onmessage = function(event) {
            var data = JSON.parse(event.data);

            if (data.type === "world_tick") {
                // Here we would call the factory to update entities
                // self.updateWorld(data);
            }
        };

        socket.onerror = function(err) {
            console.error("SceneInitializer: WebSocket error", err);
        };

        socket.onclose = function() {
            setTimeout(function() { self.setupNetwork(); }, 5000);
        };

        this.socket = socket;
    } catch (e) {
        console.error("SceneInitializer: Failed to create WebSocket", e);
    }
};
