"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myPlayerId = void 0;
exports.sendDialogueChoice = sendDialogueChoice;
exports.connectSocket = connectSocket;
var renderer_ts_1 = require("../engine/renderer.ts");
var hud_ts_1 = require("../ui/hud.ts");
var interaction_ts_1 = require("../utils/interaction.ts");
exports.myPlayerId = null;
var latestState = null;
var cooldowns = {
    attack: 0,
    interact: 0,
    equip: 0
};
var CD_DURATIONS = {
    attack: 800,
    interact: 500,
    equip: 500
};
function sendDialogueChoice(npcId, nodeId, choiceId) {
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
        globalWs.send(JSON.stringify({
            type: "dialogue_choice",
            npcId: npcId,
            nodeId: nodeId,
            choiceId: choiceId
        }));
    }
}
var globalWs = null;
function connectSocket() {
    var wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var ws = new WebSocket("".concat(wsProtocol, "//").concat(location.host, "/ws"));
    globalWs = ws;
    // Update cooldowns UI every frame
    var cdInterval = setInterval(function () {
        (0, hud_ts_1.updateCooldowns)(cooldowns);
    }, 100);
    ws.onopen = function () {
        console.log("Connected to Arelorian server");
        var name = prompt("Enter your Character Name:", "Hero") || "Hero";
        ws.send(JSON.stringify({ type: "login", name: name }));
    };
    ws.onmessage = function (msg) {
        try {
            var data_1 = JSON.parse(msg.data);
            if (data_1.type === "welcome") {
                exports.myPlayerId = data_1.id;
                console.log("Logged in as:", exports.myPlayerId);
                if (data_1.stats) {
                    (0, hud_ts_1.updateHUD)({
                        gold: data_1.stats.gold || 0,
                        xp: data_1.stats.xp || 0,
                        quests: data_1.stats.quests || [],
                        inventory: data_1.stats.inventory || [],
                        equipment: data_1.stats.equipment
                    });
                }
            }
            else if (data_1.type === "world_tick") {
                latestState = data_1;
                (0, renderer_ts_1.updateWorldState)(data_1, exports.myPlayerId);
                // Update HUD with my player's stats
                if (exports.myPlayerId) {
                    var myPlayer = data_1.players.find(function (p) { return p.id === exports.myPlayerId; });
                    if (myPlayer) {
                        (0, hud_ts_1.updateHUD)({
                            gold: myPlayer.gold || 0,
                            xp: myPlayer.xp || 0,
                            quests: myPlayer.quests || [],
                            inventory: myPlayer.inventory || [],
                            equipment: myPlayer.equipment,
                            reputation: myPlayer.reputation,
                            questStatus: myPlayer.questStatus
                        });
                    }
                }
            }
            else if (data_1.type === "dialogue") {
                (0, hud_ts_1.showDialogue)(data_1.source, data_1.text, data_1.choices, data_1.npcId);
            }
            else if (data_1.type === "combat_feedback") {
                // Find NPC position
                var npc = latestState.npcs.find(function (n) { return n.id === data_1.targetId; });
                if (npc) {
                    (0, renderer_ts_1.showFloatingText)("-".concat(data_1.damage), npc.position.x, npc.position.y);
                }
            }
        }
        catch (e) {
            console.error("Failed to parse message", e);
        }
    };
    // Basic movement controls for testing
    window.addEventListener("keydown", function (e) {
        if (!exports.myPlayerId)
            return;
        if (e.key === "g" || e.key === "G") {
            if (Date.now() < cooldowns.equip)
                return;
            // Equip first item in inventory
            if (latestState && latestState.players) {
                var myPlayer = latestState.players.find(function (p) { return p.id === exports.myPlayerId; });
                if (myPlayer && myPlayer.inventory && myPlayer.inventory.length > 0) {
                    cooldowns.equip = Date.now() + CD_DURATIONS.equip;
                    ws.send(JSON.stringify({
                        type: "equip",
                        itemId: myPlayer.inventory[0].id
                    }));
                }
            }
            return;
        }
        if (e.key === "h" || e.key === "H") {
            if (Date.now() < cooldowns.equip)
                return;
            // Unequip weapon
            cooldowns.equip = Date.now() + CD_DURATIONS.equip;
            ws.send(JSON.stringify({
                type: "unequip",
                slot: "weapon"
            }));
            return;
        }
        if (e.key === "f" || e.key === "F") {
            if (Date.now() < cooldowns.attack)
                return;
            // Attack closest NPC
            if (latestState && latestState.npcs && latestState.players) {
                var myPlayer = latestState.players.find(function (p) { return p.id === exports.myPlayerId; });
                if (myPlayer) {
                    var closestNpc = null;
                    var minDistance = Infinity;
                    for (var _i = 0, _a = latestState.npcs; _i < _a.length; _i++) {
                        var npc = _a[_i];
                        var dist = Math.hypot(myPlayer.position.x - npc.position.x, myPlayer.position.y - npc.position.y);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestNpc = npc;
                        }
                    }
                    if (closestNpc && minDistance < 40) {
                        cooldowns.attack = Date.now() + CD_DURATIONS.attack;
                        ws.send(JSON.stringify({
                            type: "attack",
                            targetId: closestNpc.id
                        }));
                    }
                }
            }
            return;
        }
        if (e.key === "e" || e.key === "E") {
            if (Date.now() < cooldowns.interact)
                return;
            // Find closest NPC or Loot
            if (latestState && (latestState.npcs || latestState.loot) && latestState.players) {
                var myPlayer = latestState.players.find(function (p) { return p.id === exports.myPlayerId; });
                if (myPlayer) {
                    var closestInteractable = (0, interaction_ts_1.getClosestInteractable)(myPlayer, latestState);
                    if (closestInteractable) {
                        cooldowns.interact = Date.now() + CD_DURATIONS.interact;
                        ws.send(JSON.stringify({
                            type: "interact",
                            targetId: closestInteractable.id
                        }));
                    }
                    else {
                        (0, hud_ts_1.showDialogue)("System", "No one is nearby to interact with.");
                    }
                }
            }
            return;
        }
        if (e.key === "i" || e.key === "I") {
            var myPlayer = latestState.players.find(function (p) { return p.id === exports.myPlayerId; });
            if (myPlayer) {
                (0, hud_ts_1.renderInventoryPanel)(myPlayer, ws);
            }
            return;
        }
        var dx = 0;
        var dy = 0;
        if (e.key === "ArrowUp" || e.key === "w")
            dy -= 1;
        if (e.key === "ArrowDown" || e.key === "s")
            dy += 1;
        if (e.key === "ArrowLeft" || e.key === "a")
            dx -= 1;
        if (e.key === "ArrowRight" || e.key === "d")
            dx += 1;
        if (dx !== 0 || dy !== 0) {
            // Client no longer calculates or sends absolute positions.
            // We only send movement intent (direction).
            ws.send(JSON.stringify({
                type: "move_intent",
                dx: dx,
                dy: dy
            }));
        }
    });
    return ws;
}
