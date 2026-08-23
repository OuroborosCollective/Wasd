import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { createClient, type AgentState, type PlayerState } from "@wasd/core-network";
import { createArelorianHud, formatCooldownTicks, type ArelorianHud } from "./ui/ArelorianHud";
import { HUD_TICK_MS, getSkillCooldownTicks, mapToArelorianHudState, msToHudCooldownTicks, type HudSkillSource } from "./ui/ArelorianHudStateMapper";

const TILE_SIZE = 32;
const SCALE = 2;
const MOVE_SEND_FRAME_INTERVAL = 9;

function mapWorldToScreen(x: number, z: number, w: number, h: number) {
  return { sx: w / 2 + x * TILE_SIZE * SCALE, sy: h / 2 - z * TILE_SIZE * SCALE };
}

interface Entity { graphics: Graphics; label: Text; tx: number; tz: number }
interface Joystick { active: boolean; sx: number; sy: number; cx: number; cy: number; dx: number; dy: number }
interface CharData { name: string; lvl: number; hp: number; mp: number; maxHp: number; maxMp: number; xp: number; gold: number }
interface Quest { id: string; title: string; obj: string; p: number; t: number; done: boolean }
interface Skill { id: string; name: string; cooldownTicksRemaining: number; ready: boolean; ico: string }
interface ChatMsg { ch: string; from: string; txt: string }
interface Item { id: string; name: string; cnt: number; ico: string }
type EquipmentSlots = Record<string, Item>;
interface SkillBookEntry { id: string; xp: number; level: number; nextLevelXP: number; progressPercent: number }
interface PlayerStatsSnapshot {
  playerId: string;
  skills: Record<string, { xp: number; level: number; nextLevelXP: number; progressPercent: number }>;
  unspentStatPoints: number;
  totalLevel: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  level: number;
}

const PENDING_CHAR: CharData = { name: "Snapshot pending", lvl: 0, hp: 0, mp: 0, maxHp: 0, maxMp: 0, xp: 0, gold: 0 };
const DEFAULT_ACTION_SKILLS: Skill[] = [
  { id: "atk", name: "Attack", cooldownTicksRemaining: 0, ready: true, ico: "⚔️" },
  { id: "def", name: "Defend", cooldownTicksRemaining: msToHudCooldownTicks(5000), ready: false, ico: "🛡️" },
  { id: "mag", name: "Magic", cooldownTicksRemaining: msToHudCooldownTicks(3000), ready: false, ico: "✨" },
  { id: "int", name: "Interact", cooldownTicksRemaining: 0, ready: true, ico: "👆" },
];

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asItem(value: any): Item | null {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id ?? value.uid ?? value.itemId ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(value.name ?? value.baseType ?? value.itemId ?? id),
    cnt: Math.max(1, Math.floor(asNumber(value.cnt ?? value.count ?? value.quantity, 1))),
    ico: String(value.ico ?? value.icon ?? value.iconId ?? "◇"),
  };
}

function normalizeInventory(payload: any): Item[] {
  const source = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
  return source.map(asItem).filter((item): item is Item => Boolean(item));
}

function normalizeEquipment(payload: any): EquipmentSlots {
  const source = payload?.equipment ?? payload?.slots ?? payload;
  if (!source || typeof source !== "object") return {};
  const slots: EquipmentSlots = {};
  for (const [slot, value] of Object.entries(source)) {
    const item = asItem(value);
    if (item) slots[slot] = item;
  }
  return slots;
}

function normalizeQuests(payload: any): Quest[] {
  const source = Array.isArray(payload?.quests) ? payload.quests : Array.isArray(payload) ? payload : [];
  return source.map((quest: any) => ({
    id: String(quest.id ?? quest.questId ?? ""),
    title: String(quest.title ?? quest.name ?? quest.id ?? "Quest"),
    obj: String(quest.obj ?? quest.objective ?? quest.description ?? "Awaiting server objective"),
    p: Math.max(0, Math.floor(asNumber(quest.p ?? quest.progress, 0))),
    t: Math.max(1, Math.floor(asNumber(quest.t ?? quest.target, 1))),
    done: Boolean(quest.done ?? quest.completed),
  })).filter((quest: Quest) => quest.id.length > 0);
}

function skillBookFromSnapshot(snapshot: PlayerStatsSnapshot | null): SkillBookEntry[] {
  if (!snapshot) return [];
  return Object.entries(snapshot.skills ?? {})
    .map(([id, skill]) => ({
      id,
      xp: Math.max(0, Math.floor(asNumber(skill.xp, 0))),
      level: Math.max(1, Math.floor(asNumber(skill.level, 1))),
      nextLevelXP: Math.max(1, Math.floor(asNumber(skill.nextLevelXP, 1))),
      progressPercent: Math.max(0, Math.min(100, asNumber(skill.progressPercent, 0))),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function charFromStats(snapshot: PlayerStatsSnapshot): CharData {
  return {
    name: "Player",
    lvl: Math.max(1, Math.floor(asNumber(snapshot.level, 1))),
    hp: Math.max(0, Math.floor(asNumber(snapshot.hp, 0))),
    mp: Math.max(0, Math.floor(asNumber(snapshot.mana, 0))),
    maxHp: Math.max(1, Math.floor(asNumber(snapshot.maxHp, 1))),
    maxMp: Math.max(0, Math.floor(asNumber(snapshot.maxMana, 0))),
    xp: skillBookFromSnapshot(snapshot).reduce((total, skill) => total + skill.xp, 0),
    gold: Math.max(0, Math.floor(asNumber(snapshot.gold, 0))),
  };
}

export function App() {
  const cRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const hudRef = useRef<ArelorianHud | null>(null);
  const ents = useRef<Map<string, Entity>>(new Map());
  const keys = useRef<Set<string>>(new Set());
  const moveFrameGate = useRef(MOVE_SEND_FRAME_INTERVAL);
  const clientTickAccumulator = useRef(0);
  const joy = useRef<Joystick>({ active: false, sx: 0, sy: 0, cx: 0, cy: 0, dx: 0, dy: 0 });
  const joyBase = useRef<HTMLDivElement>(null);
  const joyKnob = useRef<HTMLDivElement>(null);
  const cliRef = useRef<ReturnType<typeof createClient> | null>(null);

  const [conn, setConn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [showJoy, setShowJoy] = useState(false);
  const [panel, setPanel] = useState<string | null>(null);
  const [chatTxt, setChatTxt] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [ch, setCh] = useState("local");
  const [char, setChar] = useState<CharData | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [inv, setInv] = useState<Item[]>([]);
  const [equip, setEquip] = useState<EquipmentSlots>({});
  const [playerStats, setPlayerStats] = useState<PlayerStatsSnapshot | null>(null);
  const [hasAuthoritativeSnapshot, setHasAuthoritativeSnapshot] = useState(false);

  const hudChar = char ?? PENDING_CHAR;
  const hudSkills = skills.length > 0 ? skills : DEFAULT_ACTION_SKILLS.map((skill) => ({ ...skill, ready: false, cooldownTicksRemaining: 0 }));

  useEffect(() => {
    const detectMobile = () => window.innerWidth < 768 || "ontouchstart" in window;
    const update = () => {
      const m = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || detectMobile();
      setMobile(m);
      setShowJoy(m);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    hudRef.current?.updateState(mapToArelorianHudState({
      character: hudChar,
      skills: hudSkills,
      connected: conn,
    }));
  }, [hudChar, hudSkills, conn]);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (e.key === "Escape") setPanel(null);
      if (e.key.toLowerCase() === "e") togglePanel("character");
      if (e.key.toLowerCase() === "i") togglePanel("inventory");
      if (e.key.toLowerCase() === "q") togglePanel("quests");
      if (e.key.toLowerCase() === "k") togglePanel("skills");
      if (e.key.toLowerCase() === "c") togglePanel("chat");
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useEffect(() => {
    if (!cRef.current || appRef.current) return;
    const app = new Application();
    appRef.current = app;
    app.init({ background: 0x0f0f1a, resizeTo: cRef.current, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true })
      .then(() => {
        cRef.current?.appendChild(app.canvas);
        const hud = createArelorianHud(mapToArelorianHudState({
          character: hudChar,
          skills: hudSkills,
          connected: conn,
        }), {}, {
          onSkillSlot: (slotIndex) => {
            const skill = skills[slotIndex];
            if (skill) useSkill(skill.id);
          },
        });
        hud.resize(app.screen.width, app.screen.height);
        hudRef.current = hud;
        app.stage.addChild(hud);
        startNetwork(app);
      })
      .catch((e) => setErr(String(e)));
    return () => {
      cliRef.current?.disconnect();
      hudRef.current?.destroy({ children: true });
      hudRef.current = null;
      app.destroy(true);
      appRef.current = null;
    };
  }, []);

  function applyServerSkills(nextSkills: HudSkillSource[]): void {
    const normalized = nextSkills.map((incoming, index) => {
      const cooldownTicksRemaining = getSkillCooldownTicks(incoming);
      return {
        id: String(incoming.id ?? index),
        name: String((incoming as any).name ?? incoming.id ?? `Skill ${index + 1}`),
        cooldownTicksRemaining,
        ready: incoming.ready ?? cooldownTicksRemaining <= 0,
        ico: String((incoming as any).ico ?? (incoming as any).icon ?? "◇"),
      };
    });

    if (normalized.length > 0) setSkills(normalized);
  }

  function applyHeartbeatSkills(payload: any): void {
    if (Array.isArray(payload?.skills)) {
      applyServerSkills(payload.skills);
      return;
    }
    if (Array.isArray(payload?.self?.skills)) {
      applyServerSkills(payload.self.skills);
    }
  }

  function runClientTick(): void {
    if (!hasAuthoritativeSnapshot) return;
    setSkills((currentSkills) => currentSkills.map((skill) => {
      const nextTicks = Math.max(0, skill.cooldownTicksRemaining - 1);
      return { ...skill, cooldownTicksRemaining: nextTicks, ready: nextTicks <= 0 };
    }));
  }

  function applyPlayerStatsSnapshot(payload: any): void {
    if (!payload || typeof payload !== "object") return;
    const snapshot = payload as PlayerStatsSnapshot;
    setPlayerStats(snapshot);
    setChar((current) => ({ ...charFromStats(snapshot), name: current?.name && current.name !== PENDING_CHAR.name ? current.name : "Player" }));
    setHasAuthoritativeSnapshot(true);
  }

  function applyPlayerSnapshot(payload: any): void {
    if (!payload || typeof payload !== "object") return;
    if (payload.stats) applyPlayerStatsSnapshot(payload.stats);
    if (payload.character) setChar((current) => ({ ...(current ?? PENDING_CHAR), ...payload.character }));
    if (payload.inventory) setInv(normalizeInventory(payload.inventory));
    if (payload.equipment) setEquip(normalizeEquipment(payload.equipment));
    if (payload.quests) setQuests(normalizeQuests(payload.quests));
    setHasAuthoritativeSnapshot(true);
  }

  function startNetwork(app: Application) {
    const wsUrl = (import.meta.env.VITE_WS_URL as string | undefined) || window.location.origin;
    const client = createClient({ url: wsUrl, heartbeatInterval: 30000 });
    cliRef.current = client;

    client.on("connect", () => setConn(true));
    client.on("disconnect", () => setConn(false));
    client.on("WORLD_HEARTBEAT", (e: any) => {
      updateEntities(app, e.payload?.players ?? {}, e.payload?.agents ?? e.payload?.npcs ?? {});
      applyHeartbeatSkills(e.payload);
      if (e.payload?.self) applyPlayerSnapshot(e.payload.self);
    });
    client.on("PLAYER_JOINED", (e: any) => addChatMsg("system", "system", `${e.payload?.name || "Player"} joined`));
    client.on("PLAYER_LEFT", (e: any) => removeEntity(e.payload?.playerId));
    client.on("PLAYER_MOVED", (e: any) => {
      const ent = ents.current.get(e.payload?.playerId);
      if (ent) { ent.tx = e.payload?.x; ent.tz = e.payload?.z; }
    });
    client.on("CHAT_MSG", (e: any) => addChatMsg(e.payload?.ch || "local", e.payload?.from || "?", e.payload?.txt || ""));
    client.on("QUEST_DONE", (e: any) => addChatMsg("system", "system", `Quest completed: ${e.payload?.title}!`));
    client.on("CHAR_UPDATE", (e: any) => {
      if (e.payload) {
        setChar((p) => ({ ...(p ?? PENDING_CHAR), ...e.payload }));
        setHasAuthoritativeSnapshot(true);
        if (Array.isArray(e.payload.skills)) applyServerSkills(e.payload.skills);
      }
    });
    client.on("SKILL_UPDATE", (e: any) => {
      if (Array.isArray(e.payload?.skills)) applyServerSkills(e.payload.skills);
      else if (e.payload?.skill) applyServerSkills([e.payload.skill]);
    });
    client.on("INV_UPDATE", (e: any) => { setInv(normalizeInventory(e.payload)); setHasAuthoritativeSnapshot(true); });
    client.on("EQUIPMENT_SNAPSHOT", (e: any) => { setEquip(normalizeEquipment(e.payload)); setHasAuthoritativeSnapshot(true); });
    client.on("QUEST_SNAPSHOT", (e: any) => { setQuests(normalizeQuests(e.payload)); setHasAuthoritativeSnapshot(true); });
    client.on("PLAYER_SNAPSHOT", (e: any) => applyPlayerSnapshot(e.payload));
    client.on("player_stats_snapshot", (e: any) => applyPlayerStatsSnapshot(e.payload));

    client.connect();

    app.ticker.add((ticker) => {
      clientTickAccumulator.current += ticker.deltaMS;
      while (clientTickAccumulator.current >= HUD_TICK_MS) {
        clientTickAccumulator.current -= HUD_TICK_MS;
        runClientTick();
      }

      let dx = 0;
      let dz = 0;
      const k = keys.current;
      if (k.has("w") || k.has("arrowup")) dz += 1;
      if (k.has("s") || k.has("arrowdown")) dz -= 1;
      if (k.has("a") || k.has("arrowleft")) dx -= 1;
      if (k.has("d") || k.has("arrowright")) dx += 1;
      if (joy.current.active) { dx = joy.current.dx; dz = -joy.current.dy; }

      const hasMovement = dx !== 0 || dz !== 0;
      moveFrameGate.current = hasMovement ? moveFrameGate.current + 1 : MOVE_SEND_FRAME_INTERVAL;
      if (hasMovement && cliRef.current?.connected && moveFrameGate.current >= MOVE_SEND_FRAME_INTERVAL) {
        moveFrameGate.current = 0;
        cliRef.current.sendPlayerAction("MOVE", { dx, dz });
      }

      const { width, height } = app.screen;
      hudRef.current?.resize(width, height);
      ents.current.forEach((ent) => {
        const { sx, sy } = mapWorldToScreen(ent.tx, ent.tz, width, height);
        ent.graphics.x += (sx - ent.graphics.x) * 0.15;
        ent.graphics.y += (sy - ent.graphics.y) * 0.15;
        ent.label.x = ent.graphics.x - ent.label.width / 2;
        ent.label.y = ent.graphics.y - TILE_SIZE - 12;
      });
    });
  }

  function updateEntities(app: Application, players: Record<string, PlayerState>, agents: Record<string, AgentState>) {
    Object.entries(players).forEach(([id, p]) => {
      if (!ents.current.has(id)) addEntity(app, id, p.x, p.z, p.name, 0x4488ff);
      else { ents.current.get(id)!.tx = p.x; ents.current.get(id)!.tz = p.z; }
    });
    Object.entries(agents).forEach(([id, a]) => {
      if (!ents.current.has(id)) addEntity(app, id, a.x, a.z, a.name, 0x00ff00);
      else { ents.current.get(id)!.tx = a.x; ents.current.get(id)!.tz = a.z; }
    });
  }

  function addEntity(app: Application, id: string, x: number, z: number, name: string, color: number) {
    const { width, height } = app.screen;
    const { sx, sy } = mapWorldToScreen(x, z, width, height);
    const gr = new Graphics();
    gr.rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
    gr.fill(color);
    gr.stroke({ width: 2, color: 0xffffff });
    gr.x = sx;
    gr.y = sy;
    const lb = new Text({ text: name, style: { fontSize: 10, fill: 0xffffff } });
    lb.x = sx - lb.width / 2;
    lb.y = sy - TILE_SIZE - 12;
    app.stage.addChild(gr);
    app.stage.addChild(lb);
    hudRef.current && app.stage.setChildIndex(hudRef.current, app.stage.children.length - 1);
    ents.current.set(id, { graphics: gr, label: lb, tx: x, tz: z });
  }

  function removeEntity(id?: string) {
    if (!id) return;
    const e = ents.current.get(id);
    if (e && appRef.current) {
      appRef.current.stage.removeChild(e.graphics);
      appRef.current.stage.removeChild(e.label);
      e.graphics.destroy();
      e.label.destroy();
      ents.current.delete(id);
    }
  }

  function addChatMsg(channel: string, from: string, txt: string) {
    setMsgs((prev) => [...prev.slice(-49), { ch: channel, from, txt }]);
  }

  function sendChatMsg() {
    if (!chatTxt.trim()) return;
    if (cliRef.current?.connected) cliRef.current.sendPlayerAction("CHAT", { channel: ch, text: chatTxt });
    addChatMsg(ch, char?.name ?? "Player", chatTxt);
    setChatTxt("");
  }

  function useSkill(id: string) {
    const sk = skills.find((s) => s.id === id);
    if (!sk?.ready) return;
    if (cliRef.current?.connected) cliRef.current.sendPlayerAction("USE_SKILL", { skillId: id });
    setSkills((s) => s.map((skill) => skill.id === id ? { ...skill, cooldownTicksRemaining: Math.max(1, skill.cooldownTicksRemaining || 1), ready: false } : skill));
  }

  function togglePanel(p: string) { setPanel((current) => current === p ? null : p); }

  function onJoyStart(e: React.TouchEvent) {
    if (!joyBase.current) return;
    const t = e.touches[0];
    const r = joyBase.current.getBoundingClientRect();
    joy.current = { active: true, sx: r.left + r.width / 2, sy: r.top + r.height / 2, cx: t.clientX, cy: t.clientY, dx: 0, dy: 0 };
  }

  function onJoyMove(e: React.TouchEvent) {
    if (!joy.current.active) return;
    const t = e.touches[0];
    const j = joy.current;
    j.cx = t.clientX;
    j.cy = t.clientY;
    const maxDist = 50;
    let dx = j.cx - j.sx;
    let dy = j.cy - j.sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    j.dx = dx / maxDist;
    j.dy = dy / maxDist;
    if (joyKnob.current) joyKnob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function onJoyEnd() {
    joy.current = { active: false, sx: 0, sy: 0, cx: 0, cy: 0, dx: 0, dy: 0 };
    if (joyKnob.current) joyKnob.current.style.transform = "translate(0px, 0px)";
  }

  const panelStyle: React.CSSProperties = { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: mobile ? "90%" : 440, maxHeight: "70%", background: "rgba(15,15,26,0.95)", border: "2px solid rgba(100,150,255,0.5)", borderRadius: 12, padding: 16, overflow: "auto", zIndex: 200, color: "#fff", fontFamily: "monospace" };
  const closeBtn: React.CSSProperties = { marginTop: 16, width: "100%", padding: 12, background: "#f44", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer", fontWeight: "bold" };
  const emptyState = (label: string) => <div style={{ opacity: 0.7 }}>Awaiting authoritative {label} snapshot…</div>;

  const renderPanel = () => {
    if (!panel) return null;
    if (panel === "character") return <div style={panelStyle}><h2>⚔️ Character</h2>{!hasAuthoritativeSnapshot && emptyState("player")}<div>Name: {hudChar.name}</div><div>Level: {hudChar.lvl}</div><div>XP: {hudChar.xp}</div><div>Gold: 💰 {hudChar.gold}</div><div>❤️ HP: {hudChar.hp}/{hudChar.maxHp}</div><div>💙 MP: {hudChar.mp}/{hudChar.maxMp}</div>{playerStats && <><h3>Stats</h3><div>Total Level: {playerStats.totalLevel}</div><div>Unspent Stat Points: {playerStats.unspentStatPoints}</div></>}<h3>Paperdoll</h3>{Object.keys(equip).length === 0 ? emptyState("equipment") : Object.entries(equip).map(([slot, item]) => <div key={slot}>{slot}: {item.ico} {item.name}</div>)}<button onClick={() => togglePanel("character")} style={closeBtn}>Close</button></div>;
    if (panel === "inventory") return <div style={panelStyle}><h2>🎒 Inventory</h2>{inv.length === 0 ? emptyState("inventory") : inv.map((item) => <div key={item.id}>{item.ico} {item.name} x{item.cnt}</div>)}<button onClick={() => togglePanel("inventory")} style={closeBtn}>Close</button></div>;
    if (panel === "quests") return <div style={panelStyle}><h2>📜 Quests</h2>{quests.length === 0 ? emptyState("quest") : quests.map((q) => <div key={q.id}>{q.done ? "✅" : "◻"} {q.title}: {q.obj} ({q.p}/{q.t})</div>)}<button onClick={() => togglePanel("quests")} style={closeBtn}>Close</button></div>;
    if (panel === "skills") return <div style={panelStyle}><h2>✨ Skills</h2>{skillBookFromSnapshot(playerStats).length === 0 ? emptyState("skill") : skillBookFromSnapshot(playerStats).map((sk) => <div key={sk.id} style={{ marginBottom: 8 }}><strong>{sk.id}</strong> Lv.{sk.level} XP {sk.xp} → next {sk.nextLevelXP} ({sk.progressPercent.toFixed(1)}%)</div>)}<h3>Action Bar</h3>{skills.length === 0 ? emptyState("action skill") : skills.map((sk) => <button key={sk.id} onClick={() => useSkill(sk.id)} disabled={!sk.ready}>{sk.ico} {sk.name} {sk.cooldownTicksRemaining > 0 ? formatCooldownTicks(sk.cooldownTicksRemaining) : ""}</button>)}<button onClick={() => togglePanel("skills")} style={closeBtn}>Close</button></div>;
    if (panel === "chat") return <div style={panelStyle}><h2>💬 Chat</h2><div>{["local", "trade", "world"].map((c) => <button key={c} onClick={() => setCh(c)}>{c}</button>)}</div><div>{msgs.filter((m) => m.ch === ch).map((m, i) => <div key={i}>[{m.from}] {m.txt}</div>)}</div><input value={chatTxt} onChange={(e) => setChatTxt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMsg()} /><button onClick={() => togglePanel("chat")} style={closeBtn}>Close</button></div>;
    return null;
  };

  const status: React.CSSProperties = { position: "absolute", top: 16, left: 60, color: "#fff", fontFamily: "monospace", fontSize: 12, zIndex: 10 };
  const topBar: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20, padding: "8px 16px", background: "rgba(0,0,0,0.7)", fontFamily: "monospace", fontSize: 12, color: "#fff", zIndex: 10 };
  const skillBar: React.CSSProperties = { position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 };
  const actionBtns: React.CSSProperties = { position: "absolute", top: 60, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 10 };
  const actionBtn: React.CSSProperties = { width: 40, height: 40, background: "rgba(30,30,50,0.8)", border: "1px solid #446", borderRadius: 8, fontSize: 18, cursor: "pointer" };
  const joyBaseStyle: React.CSSProperties = { position: "absolute", bottom: 40, left: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", touchAction: "none", zIndex: 100 };
  const joyKnobStyle: React.CSSProperties = { position: "absolute", top: "50%", left: "50%", width: 50, height: 50, marginTop: -25, marginLeft: -25, borderRadius: "50%", background: "rgba(255,255,255,0.5)", transition: "transform 0.05s" };
  const hint: React.CSSProperties = { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 11, zIndex: 10 };

  return <div ref={cRef} style={{ width: "100%", height: "100%", position: "relative" }}>
    {!conn && !err && <div style={status}>Connecting...</div>}
    {conn && !hasAuthoritativeSnapshot && !err && <div style={status}>Connected. Awaiting ARE snapshot…</div>}
    {err && <div style={{ ...status, color: "#f55" }}>Error: {err}</div>}
    <div style={topBar}><div>❤️ {hudChar.hp}/{hudChar.maxHp}</div><div>💙 {hudChar.mp}/{hudChar.maxMp}</div><div>⭐ Lv.{hudChar.lvl}</div><div>💰 {hudChar.gold}</div></div>
    <div style={skillBar}>{hudSkills.slice(0, 4).map((sk) => <button key={sk.id} onClick={() => useSkill(sk.id)} disabled={!sk.ready}>{sk.ico}</button>)}</div>
    <div style={actionBtns}><button onClick={() => togglePanel("character")} style={actionBtn}>👤</button><button onClick={() => togglePanel("inventory")} style={actionBtn}>🎒</button><button onClick={() => togglePanel("quests")} style={actionBtn}>📜</button><button onClick={() => togglePanel("skills")} style={actionBtn}>✨</button><button onClick={() => togglePanel("chat")} style={actionBtn}>💬</button></div>
    {showJoy && <div ref={joyBase} onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd} style={joyBaseStyle}><div ref={joyKnob} style={joyKnobStyle} /></div>}
    {!mobile && conn && <div style={hint}>E:Char I:Inv Q:Quest K:Skills C:Chat</div>}
    {renderPanel()}
  </div>;
}
