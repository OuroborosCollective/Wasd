"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHUD = renderHUD;
exports.updateHUD = updateHUD;
exports.updateCooldowns = updateCooldowns;
exports.showFloatingText = showFloatingText;
exports.showTooltip = showTooltip;
exports.hideTooltip = hideTooltip;
exports.showDialogue = showDialogue;
exports.removeWorldLabel = removeWorldLabel;
exports.createWorldLabel = createWorldLabel;
exports.renderInventoryPanel = renderInventoryPanel;
function renderHUD() {
    var hud = document.createElement("div");
    hud.id = "main-hud";
    hud.style.position = "fixed";
    hud.style.top = "12px";
    hud.style.left = "12px";
    hud.style.padding = "12px";
    hud.style.background = "rgba(0,0,0,0.7)";
    hud.style.color = "#fff";
    hud.style.fontFamily = "sans-serif";
    hud.style.borderRadius = "8px";
    hud.style.display = "flex";
    hud.style.flexDirection = "column";
    hud.style.gap = "6px";
    hud.style.minWidth = "200px";
    hud.style.border = "1px solid rgba(255,255,255,0.1)";
    hud.innerHTML = "\n    <div style=\"font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px; margin-bottom: 4px; color: #00ff00;\">Areloria Alpha</div>\n    <div id=\"hud-stats\" style=\"font-size: 0.9em;\">\n      Gold: 0 | XP: 0\n    </div>\n    <div id=\"hud-inventory\" style=\"font-size: 0.8em; color: #ffcc00;\">\n      Inv: Empty\n    </div>\n    <div id=\"hud-reputation\" style=\"font-size: 0.8em; color: #ff99ff;\">\n      Rep: None\n    </div>\n    <div id=\"hud-equipment\" style=\"font-size: 0.8em; color: #00ccff;\">\n      Equip: None\n    </div>\n    <div id=\"hud-quests\" style=\"font-size: 0.85em; color: #aaa; font-style: italic;\">\n      Active Quest: None\n    </div>\n    <div id=\"hud-cooldowns\" style=\"font-size: 0.8em; margin-top: 4px; display: flex; gap: 8px;\">\n      <span id=\"cd-attack\" style=\"color: #00ff00; opacity: 0.5;\">[F] Attack</span>\n      <span id=\"cd-interact\" style=\"color: #00ff00; opacity: 0.5;\">[E] Interact</span>\n      <span id=\"cd-equip\" style=\"color: #00ff00; opacity: 0.5;\">[G] Equip</span>\n    </div>\n    <div style=\"font-size: 0.75em; margin-top: 6px; opacity: 0.6; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px;\">\n      WASD: Move | E: Interact | F: Attack | G: Equip First | H: Unequip\n    </div>\n  ";
    document.body.appendChild(hud);
}
function updateHUD(data) {
    var stats = document.getElementById("hud-stats");
    if (stats) {
        stats.textContent = "Gold: ".concat(data.gold, " | XP: ").concat(data.xp);
    }
    var inv = document.getElementById("hud-inventory");
    if (inv) {
        var items = data.inventory.map(function (i) { return i.name; }).join(", ");
        inv.textContent = items ? "Inv: ".concat(items) : "Inv: Empty";
    }
    var rep = document.getElementById("hud-reputation");
    if (rep) {
        var repStr = data.reputation ? Object.entries(data.reputation).map(function (_a) {
            var k = _a[0], v = _a[1];
            return "".concat(k, ": ").concat(v);
        }).join(", ") : "None";
        rep.textContent = "Rep: ".concat(repStr);
    }
    var equip = document.getElementById("hud-equipment");
    if (equip && data.equipment) {
        var weapon = data.equipment.weapon ? data.equipment.weapon.name : "None";
        equip.textContent = "Weapon: ".concat(weapon);
    }
    var questContainer = document.getElementById("hud-quests");
    if (questContainer && data.questStatus) {
        questContainer.innerHTML = "<strong>Quests:</strong><br/>" + data.questStatus.map(function (q) {
            return "<div style=\"color: ".concat(q.state === 'active' ? '#00ff00' : q.state === 'completed' ? '#aaa' : q.state === 'available' ? '#ffff00' : '#ff4444', "\">\n        ").concat(q.title, " [").concat(q.state, "]\n      </div>");
        }).join("");
    }
}
function updateCooldowns(cooldowns) {
    var now = Date.now();
    var updateCd = function (id, remaining) {
        var el = document.getElementById(id);
        if (el) {
            if (remaining > 0) {
                el.style.opacity = "1";
                el.style.color = "#ff4444";
                el.style.fontWeight = "bold";
                // Show percentage or just dimmed
                var percent = Math.ceil((remaining / 1000) * 10) / 10;
                el.textContent = "[".concat(id.split("-")[1].toUpperCase().charAt(0), "] ").concat(remaining > 100 ? (remaining / 1000).toFixed(1) + "s" : "...");
            }
            else {
                el.style.opacity = "0.5";
                el.style.color = "#00ff00";
                el.style.fontWeight = "normal";
                var label = id === "cd-attack" ? "Attack" : id === "cd-interact" ? "Interact" : "Equip";
                var key = id === "cd-attack" ? "F" : id === "cd-interact" ? "E" : "G";
                el.textContent = "[".concat(key, "] ").concat(label);
            }
        }
    };
    var attackRemaining = Math.max(0, cooldowns.attack - now);
    var interactRemaining = Math.max(0, cooldowns.interact - now);
    var equipRemaining = Math.max(0, cooldowns.equip - now);
    updateCd("cd-attack", attackRemaining);
    updateCd("cd-interact", interactRemaining);
    updateCd("cd-equip", equipRemaining);
}
function showFloatingText(text, x, y) {
    var div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "".concat(x, "px");
    div.style.top = "".concat(y, "px");
    div.style.color = "#ff0000";
    div.style.fontWeight = "bold";
    div.style.fontSize = "20px";
    div.style.pointerEvents = "none";
    div.style.zIndex = "1001";
    div.textContent = text;
    document.body.appendChild(div);
    // Animate and remove
    div.animate([
        { transform: "translateY(0)", opacity: 1 },
        { transform: "translateY(-50px)", opacity: 0 }
    ], {
        duration: 1000,
        easing: "ease-out"
    }).onfinish = function () { return div.remove(); };
}
function showTooltip(text) {
    var tooltip = document.getElementById("interaction-tooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "interaction-tooltip";
        tooltip.style.position = "fixed";
        tooltip.style.bottom = "100px";
        tooltip.style.left = "50%";
        tooltip.style.transform = "translateX(-50%)";
        tooltip.style.background = "rgba(0, 0, 0, 0.8)";
        tooltip.style.color = "#fff";
        tooltip.style.padding = "8px 16px";
        tooltip.style.borderRadius = "6px";
        tooltip.style.border = "1px solid #00ff00";
        tooltip.style.zIndex = "1000";
        tooltip.style.pointerEvents = "none";
        document.body.appendChild(tooltip);
    }
    tooltip.textContent = text;
}
function hideTooltip() {
    var tooltip = document.getElementById("interaction-tooltip");
    if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
    }
}
function showDialogue(source, text, choices, npcId) {
    if (choices === void 0) { choices = []; }
    var dialogueBox = document.getElementById("dialogue-box");
    if (!dialogueBox) {
        dialogueBox = document.createElement("div");
        dialogueBox.id = "dialogue-box";
        dialogueBox.style.position = "fixed";
        dialogueBox.style.bottom = "20px";
        dialogueBox.style.left = "50%";
        dialogueBox.style.transform = "translateX(-50%)";
        dialogueBox.style.background = "rgba(0, 0, 0, 0.9)";
        dialogueBox.style.color = "#fff";
        dialogueBox.style.padding = "20px 30px";
        dialogueBox.style.borderRadius = "12px";
        dialogueBox.style.fontFamily = "sans-serif";
        dialogueBox.style.minWidth = "400px";
        dialogueBox.style.maxWidth = "600px";
        dialogueBox.style.textAlign = "left";
        dialogueBox.style.boxShadow = "0 10px 25px rgba(0,0,0,0.5)";
        dialogueBox.style.border = "1px solid rgba(255,255,255,0.1)";
        dialogueBox.style.zIndex = "1000";
        document.body.appendChild(dialogueBox);
    }
    var html = "<div style=\"margin-bottom: 12px;\"><strong style=\"color: #00ff00; font-size: 1.1em;\">".concat(source, ":</strong> <span style=\"line-height: 1.4;\">").concat(text, "</span></div>");
    if (choices && choices.length > 0 && npcId) {
        html += "<div style=\"display: flex; flex-direction: column; gap: 8px; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;\">";
        choices.forEach(function (choice, index) {
            html += "\n        <button \n          class=\"dialogue-choice-btn\" \n          data-npc-id=\"".concat(npcId, "\" \n          data-node-id=\"").concat(choice.nextNodeId, "\"\n          data-choice-id=\"").concat(choice.id, "\"\n          style=\"background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 8px 12px; border-radius: 6px; cursor: pointer; text-align: left; transition: all 0.2s;\"\n          onmouseover=\"this.style.background='rgba(255,255,255,0.15)'; this.style.borderColor='#00ff00';\"\n          onmouseout=\"this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='rgba(255,255,255,0.2)';\"\n        >\n          ").concat(index + 1, ". ").concat(choice.text, "\n        </button>\n      ");
        });
        html += "</div>";
    }
    else {
        html += "<div style=\"font-size: 0.8em; opacity: 0.5; margin-top: 12px; text-align: center;\">(Press E to continue)</div>";
    }
    dialogueBox.innerHTML = html;
    // Add event listeners to buttons
    var buttons = dialogueBox.querySelectorAll(".dialogue-choice-btn");
    buttons.forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            var target = e.currentTarget;
            var nid = target.getAttribute("data-npc-id");
            var node = target.getAttribute("data-node-id");
            var choiceId = target.getAttribute("data-choice-id");
            if (nid && node && choiceId) {
                window.sendDialogueChoice(nid, node, choiceId);
            }
        });
    });
    // Auto-hide after 10 seconds if no choices
    if (window.dialogueTimeout) {
        clearTimeout(window.dialogueTimeout);
    }
    if (!choices || choices.length === 0) {
        window.dialogueTimeout = setTimeout(function () {
            if (dialogueBox && dialogueBox.parentNode) {
                dialogueBox.parentNode.removeChild(dialogueBox);
            }
        }, 5000);
    }
}
function removeWorldLabel(id) {
    var label = document.getElementById("label-".concat(id));
    if (label)
        label.remove();
}
function createWorldLabel(id, text, type, healthPercent) {
    var label = document.getElementById("label-".concat(id));
    if (!label) {
        label = document.createElement("div");
        label.id = "label-".concat(id);
        label.style.position = "fixed";
        label.style.pointerEvents = "none";
        label.style.zIndex = "1000";
        label.style.textAlign = "center";
        document.body.appendChild(label);
    }
    var html = "<div style=\"color: white; font-size: 12px; text-shadow: 1px 1px 1px black; font-weight: bold;\">".concat(text, "</div>");
    if (type === 'npc' && healthPercent !== undefined) {
        html += "\n      <div style=\"width: 40px; height: 6px; background: #333; margin: 2px auto; border: 1px solid #000;\">\n        <div style=\"width: ".concat(Math.max(0, Math.min(100, healthPercent * 100)), "%; height: 100%; background: #00ff00;\"></div>\n      </div>\n    ");
    }
    label.innerHTML = html;
    return label;
}
function renderInventoryPanel(player, ws) {
    var panel = document.getElementById("inventory-panel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "inventory-panel";
        panel.style.position = "fixed";
        panel.style.top = "50%";
        panel.style.left = "50%";
        panel.style.transform = "translate(-50%, -50%)";
        panel.style.background = "rgba(0, 0, 0, 0.9)";
        panel.style.color = "#fff";
        panel.style.padding = "20px";
        panel.style.borderRadius = "12px";
        panel.style.border = "1px solid #00ff00";
        panel.style.zIndex = "2000";
        panel.style.minWidth = "300px";
        document.body.appendChild(panel);
    }
    var html = "<h2 style=\"margin-top:0; color: #00ff00;\">Inventory</h2>";
    // Equipment
    html += "<div style=\"margin-bottom: 15px; border-bottom: 1px solid #444; padding-bottom: 10px;\">\n    <strong>Equipped:</strong><br/>\n    Weapon: ".concat(player.equipment.weapon ? "".concat(player.equipment.weapon.name, " <button onclick=\"window.unequip('weapon')\" style=\"cursor:pointer; background:#555; color:#fff; border:none; padding:2px 5px; border-radius:3px;\">Unequip</button>") : 'None', "\n  </div>");
    // Inventory
    html += "<strong>Items:</strong><ul style=\"list-style:none; padding:0;\">";
    player.inventory.forEach(function (item) {
        html += "<li style=\"margin-bottom: 5px; background: #222; padding: 5px; border-radius: 4px; display:flex; justify-content:space-between;\">\n      ".concat(item.name, " (").concat(item.type, ")\n      <div>\n        ").concat(item.type === 'weapon' ? "<button onclick=\"window.equip('".concat(item.id, "')\" style=\"cursor:pointer; background:#008800; color:#fff; border:none; padding:2px 5px; border-radius:3px;\">Equip</button>") : '', "\n        <button onclick=\"window.drop('").concat(item.id, "')\" style=\"cursor:pointer; background:#880000; color:#fff; border:none; padding:2px 5px; border-radius:3px;\">Drop</button>\n      </div>\n    </li>");
    });
    html += "</ul><button onclick=\"document.getElementById('inventory-panel').remove()\" style=\"margin-top:10px; cursor:pointer;\">Close</button>";
    panel.innerHTML = html;
    // Define global actions for buttons
    window.equip = function (itemId) { return ws.send(JSON.stringify({ type: 'equip', itemId: itemId })); };
    window.unequip = function (slot) { return ws.send(JSON.stringify({ type: 'unequip', slot: slot })); };
    window.drop = function (itemId) { return ws.send(JSON.stringify({ type: 'drop', itemId: itemId })); };
}
