"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClosestInteractable = getClosestInteractable;
function getClosestInteractable(player, state) {
    var closestInteractable = null;
    var minDistance = Infinity;
    // 1. Check Loot (Priority 1)
    if (state.loot) {
        for (var _i = 0, _a = state.loot; _i < _a.length; _i++) {
            var loot = _a[_i];
            var dist = Math.hypot(player.position.x - loot.position.x, player.position.y - loot.position.y);
            if (dist < 30 && dist < minDistance) {
                minDistance = dist;
                closestInteractable = __assign(__assign({}, loot), { interactionType: 'loot' });
            }
        }
    }
    // 2. Check NPCs (Priority 2, only if no loot found)
    if (!closestInteractable && state.npcs) {
        for (var _b = 0, _c = state.npcs; _b < _c.length; _b++) {
            var npc = _c[_b];
            var dist = Math.hypot(player.position.x - npc.position.x, player.position.y - npc.position.y);
            if (dist < 30 && dist < minDistance) {
                minDistance = dist;
                closestInteractable = __assign(__assign({}, npc), { interactionType: 'npc' });
            }
        }
    }
    return closestInteractable;
}
