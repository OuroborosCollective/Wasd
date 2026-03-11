"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showFloatingText = showFloatingText;
exports.initRenderer = initRenderer;
exports.updateWorldState = updateWorldState;
var THREE = require("three");
var hud_ts_1 = require("../ui/hud.ts");
var interaction_ts_1 = require("../utils/interaction.ts");
function projectToScreen(x, y, z) {
    var vector = new THREE.Vector3(x, y, z);
    vector.project(camera);
    return {
        x: (vector.x + 1) / 2 * window.innerWidth,
        y: -(vector.y - 1) / 2 * window.innerHeight
    };
}
var scene;
var camera;
var renderer;
var playerMeshes = new Map();
var npcMeshes = new Map();
var lootMeshes = new Map();
var chunkMeshes = new Map();
var activeLabels = new Set();
// For interpolation
var targetPositions = new Map();
function showFloatingText(text, x, y) {
    var vector = new THREE.Vector3(x, 2, y);
    vector.project(camera);
    var screenX = (vector.x + 1) / 2 * window.innerWidth;
    var screenY = -(vector.y - 1) / 2 * window.innerHeight;
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "".concat(screenX, "px");
    div.style.top = "".concat(screenY, "px");
    div.style.color = "#ff0000";
    div.style.fontWeight = "bold";
    div.style.fontSize = "20px";
    div.style.pointerEvents = "none";
    div.style.zIndex = "1001";
    div.textContent = text;
    document.body.appendChild(div);
    div.animate([
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-50px)", opacity: 0 }
    ], {
        duration: 1000,
        easing: "ease-out"
    }).onfinish = function () { return div.remove(); };
}
function initRenderer(canvas, myPlayerId) {
    // allow running in node/jsdom test environment by providing a canvas stub
    if (!canvas || typeof canvas.addEventListener !== 'function') {
        // dummy renderer that matches three.js interface used here
        var DummyRenderer = /** @class */ (function () {
            function DummyRenderer() {
            }
            DummyRenderer.prototype.setSize = function (w, h) { };
            DummyRenderer.prototype.render = function (scene, camera) { };
            return DummyRenderer;
        }());
        renderer = new DummyRenderer();
    }
    else {
        renderer = new THREE.WebGLRenderer({ canvas: canvas });
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 100, 100);
    camera.lookAt(0, 0, 0);
    // Add a simple grid helper for the ground
    var gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x444444);
    scene.add(gridHelper);
    // Add a "Town" marker
    var townGeo = new THREE.PlaneGeometry(128, 128);
    var townMat = new THREE.MeshBasicMaterial({ color: 0x334433, side: THREE.DoubleSide });
    var town = new THREE.Mesh(townGeo, townMat);
    town.rotation.x = Math.PI / 2;
    town.position.set(32, 0.1, 32);
    scene.add(town);
    // Add an "Outpost" marker
    var outpostGeo = new THREE.PlaneGeometry(64, 64);
    var outpostMat = new THREE.MeshBasicMaterial({ color: 0x443333, side: THREE.DoubleSide });
    var outpost = new THREE.Mesh(outpostGeo, outpostMat);
    outpost.rotation.x = Math.PI / 2;
    outpost.position.set(500, 0.1, 500);
    scene.add(outpost);
    // Add a "Combat Training" marker
    var trainingGeo = new THREE.PlaneGeometry(32, 32);
    var trainingMat = new THREE.MeshBasicMaterial({ color: 0x444433, side: THREE.DoubleSide });
    var training = new THREE.Mesh(trainingGeo, trainingMat);
    training.rotation.x = Math.PI / 2;
    training.position.set(64, 0.1, 64);
    scene.add(training);
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    var directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 50);
    scene.add(directionalLight);
    function animate() {
        // Interpolate positions
        var lerpFactor = 0.2;
        for (var _i = 0, _a = playerMeshes.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], mesh = _b[1];
            var target = targetPositions.get(id);
            if (target) {
                mesh.position.lerp(target, lerpFactor);
                // Follow camera if it's our player (we'll need a way to identify our player)
                // For now, we'll check the material color as a hack or pass myPlayerId
                if (mesh.material.color.getHex() === 0x00ff00) {
                    camera.position.set(mesh.position.x, 100, mesh.position.z + 100);
                    camera.lookAt(mesh.position.x, 0, mesh.position.z);
                }
            }
        }
        for (var _c = 0, _d = npcMeshes.entries(); _c < _d.length; _c++) {
            var _e = _d[_c], id = _e[0], mesh = _e[1];
            var target = targetPositions.get(id);
            if (target) {
                mesh.position.lerp(target, lerpFactor);
            }
        }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    animate();
}
function updateWorldState(state, myPlayerId) {
    if (!scene)
        return;
    // Render players (Blue cubes)
    var currentPlayers = new Set();
    for (var _i = 0, _a = state.players; _i < _a.length; _i++) {
        var p = _a[_i];
        currentPlayers.add(p.id);
        if (!playerMeshes.has(p.id)) {
            var geo = new THREE.BoxGeometry(4, 4, 4);
            var mat = new THREE.MeshStandardMaterial({ color: p.id === myPlayerId ? 0x00ff00 : 0x0000ff });
            var mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(p.position.x, 2, p.position.y);
            scene.add(mesh);
            playerMeshes.set(p.id, mesh);
        }
        var target = targetPositions.get(p.id);
        if (!target) {
            target = new THREE.Vector3();
            targetPositions.set(p.id, target);
        }
        target.set(p.position.x, 2, p.position.y);
    }
    // Remove disconnected players
    for (var _b = 0, _c = playerMeshes.entries(); _b < _c.length; _b++) {
        var _d = _c[_b], id = _d[0], mesh = _d[1];
        if (!currentPlayers.has(id)) {
            scene.remove(mesh);
            playerMeshes.delete(id);
            targetPositions.delete(id);
        }
    }
    // Render NPCs (Red spheres)
    var currentNPCs = new Set();
    for (var _e = 0, _f = state.npcs; _e < _f.length; _e++) {
        var npc = _f[_e];
        currentNPCs.add(npc.id);
        if (!npcMeshes.has(npc.id)) {
            var geo = new THREE.SphereGeometry(2);
            var mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            var mesh_1 = new THREE.Mesh(geo, mat);
            mesh_1.position.set(npc.position.x, 2, npc.position.y);
            scene.add(mesh_1);
            npcMeshes.set(npc.id, mesh_1);
        }
        var target = targetPositions.get(npc.id);
        if (!target) {
            target = new THREE.Vector3();
            targetPositions.set(npc.id, target);
        }
        target.set(npc.position.x, 2, npc.position.y);
        // Update health bar (simple hack: scale the sphere)
        var mesh = npcMeshes.get(npc.id);
        // Position label
        var screenPos = projectToScreen(npc.position.x, 4, npc.position.y);
        var label = (0, hud_ts_1.createWorldLabel)(npc.id, npc.name, 'npc', npc.health / npc.maxHealth);
        label.style.left = "".concat(screenPos.x, "px");
        label.style.top = "".concat(screenPos.y, "px");
        activeLabels.add(npc.id);
    }
    // Remove despawned NPCs
    for (var _g = 0, _h = npcMeshes.entries(); _g < _h.length; _g++) {
        var _j = _h[_g], id = _j[0], mesh = _j[1];
        if (!currentNPCs.has(id)) {
            scene.remove(mesh);
            npcMeshes.delete(id);
        }
    }
    // Render Loot (Thematic bag/chest)
    var currentLoot = new Set();
    for (var _k = 0, _l = state.loot; _k < _l.length; _k++) {
        var loot = _l[_k];
        currentLoot.add(loot.id);
        var lootGroup = lootMeshes.get(loot.id);
        if (!lootGroup) {
            var group = new THREE.Group();
            // Base
            var baseGeo = new THREE.BoxGeometry(2, 1.5, 2);
            var baseMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            var baseMesh = new THREE.Mesh(baseGeo, baseMat);
            baseMesh.position.y = 0.75;
            group.add(baseMesh);
            // Lid
            var lidGeo = new THREE.BoxGeometry(2.2, 0.5, 2.2);
            var lidMat = new THREE.MeshStandardMaterial({ color: 0x5D2E0A });
            var lidMesh = new THREE.Mesh(lidGeo, lidMat);
            lidMesh.position.y = 1.75;
            group.add(lidMesh);
            group.position.set(loot.position.x, 0, loot.position.y);
            scene.add(group);
            lootMeshes.set(loot.id, group);
        }
        else {
            lootGroup.position.set(loot.position.x, 0, loot.position.y);
        }
        // Position label
        var screenPos = projectToScreen(loot.position.x, 2, loot.position.y);
        var label = (0, hud_ts_1.createWorldLabel)(loot.id, loot.item.name, 'loot');
        label.style.left = "".concat(screenPos.x, "px");
        label.style.top = "".concat(screenPos.y, "px");
        activeLabels.add(loot.id);
    }
    // Remove picked up loot
    for (var _m = 0, _o = lootMeshes.entries(); _m < _o.length; _m++) {
        var _p = _o[_m], id = _p[0], mesh = _p[1];
        if (!currentLoot.has(id)) {
            scene.remove(mesh);
            lootMeshes.delete(id);
        }
    }
    // Tooltip logic
    var myPlayer = state.players.find(function (p) { return p.id === myPlayerId; });
    if (myPlayer) {
        var closestInteractable = (0, interaction_ts_1.getClosestInteractable)(myPlayer, state);
        if (closestInteractable) {
            if (closestInteractable.interactionType === 'loot') {
                var item = closestInteractable.item;
                var rarity = item.rarity || 'Common';
                var damage = item.damage ? " | Dmg: ".concat(item.damage) : '';
                (0, hud_ts_1.showTooltip)("Press E to pick up ".concat(item.name, " (").concat(item.type, ") [").concat(rarity, "]").concat(damage));
            }
            else {
                (0, hud_ts_1.showTooltip)("Press E to interact with ".concat(closestInteractable.name || 'NPC'));
            }
        }
        else {
            (0, hud_ts_1.hideTooltip)();
        }
    }
    // Render Active Chunks (Yellow boundaries)
    var currentChunks = new Set();
    if (state.activeChunkIds) {
        for (var _q = 0, _r = state.activeChunkIds; _q < _r.length; _q++) {
            var chunkId = _r[_q];
            currentChunks.add(chunkId);
            if (!chunkMeshes.has(chunkId)) {
                var _s = chunkId.split(':').map(Number), cx = _s[0], cy = _s[1];
                var chunkSize = 64;
                // Create a square outline for the chunk
                var geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(chunkSize, 1, chunkSize));
                var mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
                var mesh = new THREE.LineSegments(geo, mat);
                // Center of the chunk
                mesh.position.set(cx * chunkSize + chunkSize / 2, 0.5, cy * chunkSize + chunkSize / 2);
                scene.add(mesh);
                chunkMeshes.set(chunkId, mesh);
            }
        }
    }
    // Remove inactive labels
    var allLabelIds = new Set(Array.from(document.querySelectorAll('[id^="label-"]')).map(function (el) { return el.id.replace('label-', ''); }));
    for (var _t = 0, allLabelIds_1 = allLabelIds; _t < allLabelIds_1.length; _t++) {
        var id = allLabelIds_1[_t];
        if (!activeLabels.has(id)) {
            (0, hud_ts_1.removeWorldLabel)(id);
        }
    }
    activeLabels.clear();
    // Remove inactive chunks
    for (var _u = 0, _v = chunkMeshes.entries(); _u < _v.length; _u++) {
        var _w = _v[_u], id = _w[0], mesh = _w[1];
        if (!currentChunks.has(id)) {
            scene.remove(mesh);
            chunkMeshes.delete(id);
        }
    }
}
