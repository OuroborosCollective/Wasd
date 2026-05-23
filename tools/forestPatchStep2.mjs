import fs from 'node:fs';
const path = 'server/src/core/WorldTick.ts';
let src = fs.readFileSync(path, 'utf8');
if (!src.includes('const actionPayload = msg.payload')) {
  src = src.replace(
    '    const checkCooldown = (cooldownMs: number) => { const cooldownTicks = Math.max(1, Math.ceil(cooldownMs / 100)); const pTimes = this.lastActionTimes.get(charName) || {}; const last = pTimes["general"] || 0; if (nowTick - last < cooldownTicks) return false; pTimes["general"] = nowTick; this.lastActionTimes.set(charName, pTimes); return true; };\n',
    '    const checkCooldown = (cooldownMs: number) => { const cooldownTicks = Math.max(1, Math.ceil(cooldownMs / 100)); const pTimes = this.lastActionTimes.get(charName) || {}; const last = pTimes["general"] || 0; if (nowTick - last < cooldownTicks) return false; pTimes["general"] = nowTick; this.lastActionTimes.set(charName, pTimes); return true; };\n    const actionPayload = msg.payload && typeof msg.payload === "object" ? msg.payload : msg;\n',
  );
}
if (!src.includes('this.pendingForestResourceActions.push')) {
  src = src.replace(
    '    else if (msg.type === "USE_SKILL")',
    '    else if (actionPayload?.kappaCoordinate) { this.pendingForestResourceActions.push({ socketId: id, playerId, input: actionPayload }); }\n    else if (msg.type === "USE_SKILL")',
  );
}
fs.writeFileSync(path, src);
