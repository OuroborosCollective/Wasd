"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var jsdom_1 = require("jsdom");
var THREE = require("three");
var fs = require("fs");
var logLines = [];
function log(msg) { logLines.push(msg); }
//console.log('test script starting');
// provide fake requestAnimationFrame for node environment
global.requestAnimationFrame = function (cb) { return setTimeout(cb, 0); };
// stub camera global used by renderer.ts
global.camera = new THREE.PerspectiveCamera();
// we need to import the renderer functions
var renderer_ts_1 = require("./src/engine/renderer.ts");
// setup dom
var dom = new jsdom_1.JSDOM("<!DOCTYPE html><body></body>");
global.window = dom.window;
global.document = dom.window.document;
function logLabels() {
    // also show tooltip element if present
    var labels = Array.from(document.querySelectorAll('[id^="label-"]')).map(function (el) { return ({ id: el.id, html: el.innerHTML }); });
    log('world labels: ' + JSON.stringify(labels));
}
function logTooltip() {
    var t = document.getElementById('interaction-tooltip');
    log('tooltip text: ' + (t ? t.textContent : '<none>'));
}
function runTest() {
    return __awaiter(this, void 0, void 0, function () {
        var canvas, state;
        return __generator(this, function (_a) {
            canvas = {
                width: 800,
                height: 600,
                // no addEventListener so renderer.ts will use DummyRenderer
                getContext: function () { return ({
                    canvas: {}
                }); }
            };
            (0, renderer_ts_1.initRenderer)(canvas, 'player1');
            state = {
                players: [{ id: 'player1', position: { x: 0, y: 0 } }],
                npcs: [{ id: 'npc1', name: 'Goblin', position: { x: 10, y: 10 }, health: 50, maxHealth: 100 }],
                loot: [{ id: 'loot1', item: { name: 'Sword', type: 'Weapon' }, position: { x: 12, y: 12 } }]
            };
            (0, renderer_ts_1.updateWorldState)(state, 'player1');
            logLabels();
            logTooltip();
            // simulate damage
            state.npcs[0].health = 25;
            (0, renderer_ts_1.updateWorldState)(state, 'player1');
            logLabels();
            logTooltip();
            // simulate pickup
            state.loot = [];
            (0, renderer_ts_1.updateWorldState)(state, 'player1');
            logLabels();
            logTooltip();
            // interaction priority test: put both loot and npc nearby
            state.loot = [{ id: 'loot2', item: { name: 'Shield', type: 'Armor' }, position: { x: 5, y: 5 } }];
            state.npcs[0].position = { x: 6, y: 6 };
            (0, renderer_ts_1.updateWorldState)(state, 'player1');
            logLabels();
            logTooltip();
            return [2 /*return*/];
        });
    });
}
runTest().then(function () {
    fs.writeFileSync('test_output.txt', logLines.join('\n'));
}).catch(function (err) {
    log('ERROR: ' + err);
    fs.writeFileSync('test_output.txt', logLines.join('\n') + '\n' + err);
});
