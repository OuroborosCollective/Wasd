import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Text } from "pixi.js";
import { createClient, type PlayerState, type AgentState } from "@wasd/core-network";

const TILE_SIZE = 32;
const SCALE = 2;

function mapWorldToScreen(x: number, z: number, w: number, h: number) {
  return { sx: w/2 + x*TILE_SIZE*SCALE, sy: h/2 - z*TILE_SIZE*SCALE };
}

interface Entity { graphics: Graphics; label: Text; tx: number; tz: number }
interface Joystick { active: boolean; sx: number; sy: number; cx: number; cy: number; dx: number; dy: number }
interface CharData { name: string; lvl: number; hp: number; mp: number; maxHp: number; maxMp: number; xp: number; gold: number }
interface Quest { id: string; title: string; obj: string; p: number; t: number; done: boolean }
interface Skill { id: string; name: string; cd: number; ready: boolean; ico: string }
interface ChatMsg { ch: string; from: string; txt: string }
interface Item { id: string; name: string; cnt: number; ico: string }
interface Equip { head: Item; chest: Item; weapon: Item }

export function App() {
  const cRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const ents = useRef<Map<string, Entity>>(new Map());
  const [conn, setConn] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [mobile, setMobile] = useState(false);
  const [showJoy, setShowJoy] = useState(false);
  const [panel, setPanel] = useState<string|null>(null);
  const [chatTxt, setChatTxt] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [ch, setCh] = useState("local");
  const [char, setChar] = useState<CharData>({name:"Player",lvl:1,hp:100,mp:50,maxHp:100,maxMp:50,xp:0,gold:0});
  const [quests, setQuests] = useState<Quest[]>([{id:"q1",title:"Welcome to Millbrook",obj:"Talk to the Elder",p:0,t:1,done:false},{id:"q2",title:"Village Tour",obj:"Explore the village",p:0,t:3,done:false}]);
  const [skills, setSkills] = useState<Skill[]>([{id:"atk",name:"Attack",cd:0,ready:true,ico:"⚔️"},{id:"def",name:"Defend",cd:5000,ready:true,ico:"🛡️"},{id:"mag",name:"Magic",cd:3000,ready:true,ico:"✨"},{id:"int",name:"Interact",cd:0,ready:true,ico:"👆"}]);
  const [inv, setInv] = useState<Item[]>([{id:"p_hp",name:"HP Potion",cnt:5,ico:"❤️"},{id:"p_mp",name:"MP Potion",cnt:3,ico:"💙"},{id:"coin",name:"Gold",cnt:100,ico:"💰"},{id:"herb",name:"Healing Herb",cnt:2,ico:"🌿"},{id:"wood",name:"Wood",cnt:10,ico:"🪵"},{id:"stone",name:"Stone",cnt:5,ico:"🪨"}]);
  const [equip, setEquip] = useState<Equip>({head:{id:"h_iron",name:"Iron Helm",cnt:1,ico:"⛑️"},chest:{id:"a_leath",name:"Leather Armor",cnt:1,ico:"👕"},weapon:{id:"s_wood",name:"Wooden Sword",cnt:1,ico:"🗡️"}});
  const keys = useRef<Set<string>>(new Set());
  const mvCd = useRef(0);
  const joy = useRef<Joystick>({active:false,sx:0,sy:0,cx:0,cy:0,dx:0,dy:0});
  const joyBase = useRef<HTMLDivElement>(null);
  const joyKnob = useRef<HTMLDivElement>(null);
  const cliRef = useRef<ReturnType<typeof createClient>|null>(null);

  // Mobile detection
  useEffect(()=>{
    const isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768 || ('ontouchstart' in window);
    setMobile(isMob);
    setShowJoy(isMob);
    const onResize = () => {
      const m = window.innerWidth < 768 || ('ontouchstart' in window);
      setMobile(m);
      setShowJoy(m);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  },[]);

  // Keyboard input
  useEffect(()=>{
    const onDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());
      if (e.key === 'Escape') setPanel(null);
      if (e.key === 'e' || e.key === 'E') togglePanel('character');
      if (e.key === 'i' || e.key === 'I') togglePanel('inventory');
      if (e.key === 'q' || e.key === 'Q') togglePanel('quests');
      if (e.key === 'k' || e.key === 'K') togglePanel('skills');
      if (e.key === 'c' || e.key === 'C') togglePanel('chat');
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  },[]);

  // Initialize PixiJS
  useEffect(()=>{
    if (!cRef.current || appRef.current) return;
    const app = new Application();
    appRef.current = app;
    app.init({ background: 0x0f0f1a, resizeTo: cRef.current!, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true })
    .then(() => {
      cRef.current!.appendChild(app.canvas);
      startNetwork(app);
    })
    .catch(setErr);
    return () => { cliRef.current?.disconnect(); app.destroy(true); };
  },[]);

  function startNetwork(app: Application) {
    const client = createClient({ url: "https://arelorian.de", heartbeatInterval: 30000 });
    cliRef.current = client;
    
    client.on("connect" as any, () => setConn(true));
    client.on("disconnect" as any, () => setConn(false));
    
    // World state updates
    client.on("WORLD_HEARTBEAT", (e: any) => {
      const { players, agents } = e.payload;
      updateEntities(app, players, agents);
    });
    
    // Player events
    client.on("PLAYER_JOINED", (e: any) => addChatMsg("system", `${e.payload?.name || "Player"} joined`));
    client.on("PLAYER_LEFT", (e: any) => removeEntity(e.payload?.playerId));
    client.on("PLAYER_MOVED", (e: any) => {
      const ent = ents.current.get(e.payload?.playerId);
      if (ent) { ent.tx = e.payload?.x; ent.tz = e.payload?.z; }
    });
    
    // Chat
    client.on("CHAT_MSG", (e: any) => addChatMsg(e.payload?.ch || "local", e.payload?.from || "?", e.payload?.txt || ""));
    client.on("QUEST_DONE", (e: any) => addChatMsg("system", `Quest completed: ${e.payload?.title}!`));
    
    // Character updates from server
    client.on("CHAR_UPDATE", (e: any) => { if (e.payload) setChar(p => ({ ...p, ...e.payload })); });
    client.on("INV_UPDATE", (e: any) => { if (e.payload?.items) setInv(e.payload.items); });
    
    client.connect();
    addChatMsg("system", "Welcome to Millbrook!");
    
    // Game loop with movement
    app.ticker.add(() => {
      let dx = 0, dz = 0;
      const k = keys.current;
      if (k.has('w') || k.has('arrowup')) dz += 1;
      if (k.has('s') || k.has('arrowdown')) dz -= 1;
      if (k.has('a') || k.has('arrowleft')) dx -= 1;
      if (k.has('d') || k.has('arrowright')) dx += 1;
      if (joy.current.active) { dx = joy.current.dx; dz = -joy.current.dy; }
      
      const now = Date.now();
      if ((dx !== 0 || dz !== 0) && cliRef.current?.connected && now - mvCd.current >= 150) {
        mvCd.current = now;
        cliRef.current.sendPlayerAction("MOVE", { dx, dz });
      }
      
      // Smooth lerp entities
      const { width, height } = app.screen;
      ents.current.forEach(ent => {
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
    gr.rect(-TILE_SIZE/2, -TILE_SIZE/2, TILE_SIZE, TILE_SIZE);
    gr.fill(color);
    gr.stroke({ width: 2, color: 0xffffff });
    gr.x = sx; gr.y = sy;
    const lb = new Text({ text: name, style: { fontSize: 10, fill: 0xffffff } });
    lb.x = sx - lb.width / 2; lb.y = sy - TILE_SIZE - 12;
    app.stage.addChild(gr);
    app.stage.addChild(lb);
    ents.current.set(id, { graphics: gr, label: lb, tx: x, tz: z });
  }

  function removeEntity(id: string) {
    const e = ents.current.get(id);
    if (e && appRef.current) {
      appRef.current.stage.removeChild(e.graphics);
      appRef.current.stage.removeChild(e.label);
      e.graphics.destroy();
      e.label.destroy();
      ents.current.delete(id);
    }
  }

  // Chat functions
  function addChatMsg(channel: string, from: string, txt: string) {
    setMsgs(prev => [...prev.slice(-49), { ch: channel, from, txt }]);
  }
  function sendChatMsg() {
    if (!chatTxt.trim()) return;
    if (cliRef.current?.connected) cliRef.current.sendPlayerAction("CHAT", { channel: ch, text: chatTxt });
    addChatMsg(ch, char.name, chatTxt);
    setChatTxt("");
  }

  // Skill cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSkills(s => s.map(sk => ({ ...sk, ready: sk.cd <= 0, cd: Math.max(0, sk.cd - 100) })));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  function useSkill(id: string) {
    const sk = skills.find(s => s.id === id);
    if (!sk?.ready) return;
    if (cliRef.current?.connected) cliRef.current.sendPlayerAction("USE_SKILL", { skillId: id });
    setSkills(s => s.map(sk => sk.id === id ? { ...sk, cd: sk.cd > 0 ? sk.cd + 100 : 100, ready: false } : sk));
  }

  function togglePanel(p: string) { setPanel(panel === p ? null : p); }

  // Joystick handlers
  function onJoyStart(e: React.TouchEvent) {
    if (!joyBase.current) return;
    const t = e.touches[0];
    const r = joyBase.current.getBoundingClientRect();
    joy.current = { active: true, sx: r.left + r.width/2, sy: r.top + r.height/2, cx: t.clientX, cy: t.clientY, dx: 0, dy: 0 };
  }
  function onJoyMove(e: React.TouchEvent) {
    if (!joy.current.active) return;
    const t = e.touches[0];
    const j = joy.current;
    j.cx = t.clientX; j.cy = t.clientY;
    const maxDist = 50;
    let dx = j.cx - j.sx, dy = j.cy - j.sy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > maxDist) { dx = (dx/dist) * maxDist; dy = (dy/dist) * maxDist; }
    j.dx = dx / maxDist; j.dy = dy / maxDist;
    if (joyKnob.current) joyKnob.current.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function onJoyEnd() {
    joy.current = { active: false, sx: 0, sy: 0, cx: 0, cy: 0, dx: 0, dy: 0 };
    if (joyKnob.current) joyKnob.current.style.transform = "translate(0px, 0px)";
  }

  // Panel rendering
  const panelStyle: React.CSSProperties = {
    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    width: mobile ? "90%" : 400, maxHeight: "70%", background: "rgba(15,15,26,0.95)",
    border: "2px solid rgba(100,150,255,0.5)", borderRadius: 12, padding: 16, overflow: "auto",
    zIndex: 200, color: "#fff", fontFamily: "monospace"
  };
  const closeBtn: React.CSSProperties = {
    marginTop: 16, width: "100%", padding: 12, background: "#f44", border: "none",
    borderRadius: 4, color: "#fff", cursor: "pointer", fontWeight: "bold"
  };

  const renderPanel = () => {
    if (!panel) return null;
    
    if (panel === 'character') {
      return (
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 16px", borderBottom: "1px solid #444", paddingBottom: 8 }}>⚔️ Character</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><strong>Name:</strong> {char.name}</div>
            <div><strong>Level:</strong> {char.lvl}</div>
            <div><strong>Gold:</strong> 💰 {char.gold}</div>
            <div><strong>XP:</strong> {char.xp}</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div>❤️ HP: {char.hp}/{char.maxHp}</div>
            <div style={{ height: 8, background: "#333", borderRadius: 4 }}>
              <div style={{ height: 8, width: `${(char.hp/char.maxHp)*100}%`, background: "#f44", borderRadius: 4 }} />
            </div>
            <div style={{ marginTop: 8 }}>💙 MP: {char.mp}/{char.maxMp}</div>
            <div style={{ height: 8, background: "#333", borderRadius: 4 }}>
              <div style={{ height: 8, width: `${(char.mp/char.maxMp)*100}%`, background: "#44f", borderRadius: 4 }} />
            </div>
          </div>
          <h3 style={{ marginTop: 16, borderBottom: "1px solid #444" }}>Equipment</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {Object.entries(equip).map(([slot, item]) => (
              <div key={slot} style={{ padding: 8, background: "#222", borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: "#888" }}>{slot.toUpperCase()}</div>
                <div>{item.ico} {item.name}</div>
              </div>
            ))}
          </div>
          <button onClick={() => togglePanel('character')} style={closeBtn}>Close</button>
        </div>
      );
    }
    
    if (panel === 'inventory') {
      return (
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 16px", borderBottom: "1px solid #444", paddingBottom: 8 }}>🎒 Inventory</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {inv.map((item, i) => (
              <div key={i} style={{ padding: 12, background: "#222", borderRadius: 4, textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{item.ico}</div>
                <div style={{ fontSize: 10 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: "#888" }}>x{item.cnt}</div>
              </div>
            ))}
          </div>
          <button onClick={() => togglePanel('inventory')} style={closeBtn}>Close</button>
        </div>
      );
    }
    
    if (panel === 'quests') {
      return (
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 16px", borderBottom: "1px solid #444", paddingBottom: 8 }}>📜 Quests</h2>
          {quests.map(q => (
            <div key={q.id} style={{ padding: 12, background: q.done ? "#223322" : "#222", borderRadius: 4, marginBottom: 8, borderLeft: q.done ? "3px solid #4f4" : "3px solid #ff4" }}>
              <div style={{ fontWeight: "bold" }}>{q.title}</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>{q.obj}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>{q.done ? "✅ Completed" : `${q.p}/${q.t}`}</div>
            </div>
          ))}
          <button onClick={() => togglePanel('quests')} style={closeBtn}>Close</button>
        </div>
      );
    }
    
    if (panel === 'skills') {
      return (
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 16px", borderBottom: "1px solid #444", paddingBottom: 8 }}>✨ Skills</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {skills.map(sk => (
              <button key={sk.id} onClick={() => useSkill(sk.id)} disabled={!sk.ready}
                style={{ padding: 16, background: sk.ready ? "#222" : "#111", border: sk.ready ? "2px solid #44f" : "2px solid #333", borderRadius: 4, color: sk.ready ? "#fff" : "#666", cursor: sk.ready ? "pointer" : "not-allowed", opacity: sk.ready ? 1 : 0.5 }}>
                <div style={{ fontSize: 24 }}>{sk.ico}</div>
                <div>{sk.name}</div>
                {sk.cd > 0 && <div style={{ fontSize: 10, color: "#f44" }}>{(sk.cd/1000).toFixed(1)}s</div>}
              </button>
            ))}
          </div>
          <button onClick={() => togglePanel('skills')} style={closeBtn}>Close</button>
        </div>
      );
    }
    
    if (panel === 'chat') {
      return (
        <div style={panelStyle}>
          <h2 style={{ margin: "0 0 16px", borderBottom: "1px solid #444", paddingBottom: 8 }}>💬 Chat</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {["local", "trade", "world"].map(c => (
              <button key={c} onClick={() => setCh(c)} style={{ padding: "4px 12px", background: ch === c ? "#44f" : "#222", border: "none", borderRadius: 4, color: "#fff", cursor: "pointer" }}>{c}</button>
            ))}
          </div>
          <div style={{ height: 200, overflow: "auto", background: "#111", borderRadius: 4, padding: 8, marginBottom: 8 }}>
            {msgs.filter(m => m.ch === ch).map((m, i) => (
              <div key={i} style={{ marginBottom: 4 }}><span style={{ color: "#888" }}>[{m.from}]</span><span style={{ color: "#fff" }}> {m.txt}</span></div>
            ))}
          </div>
          <input value={chatTxt} onChange={e => setChatTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMsg()} placeholder={`Message ${ch}...`} style={{ width: "100%", padding: 8, background: "#222", border: "1px solid #444", borderRadius: 4, color: "#fff" }} />
          <button onClick={() => togglePanel('chat')} style={closeBtn}>Close</button>
        </div>
      );
    }
    
    return null;
  };

  // Styles
  const status: React.CSSProperties = { position: "absolute", top: 16, left: 60, color: "#fff", fontFamily: "monospace", fontSize: 12, zIndex: 10 };
  const topBar: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20, padding: "8px 16px", background: "rgba(0,0,0,0.7)", fontFamily: "monospace", fontSize: 12, color: "#fff", zIndex: 10 };
  const skillBar: React.CSSProperties = { position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 };
  const actionBtns: React.CSSProperties = { position: "absolute", top: 60, right: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 10 };
  const actionBtn: React.CSSProperties = { width: 40, height: 40, background: "rgba(30,30,50,0.8)", border: "1px solid #446", borderRadius: 8, fontSize: 18, cursor: "pointer" };
  const joyBaseStyle: React.CSSProperties = { position: "absolute", bottom: 40, left: 40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", touchAction: "none", zIndex: 100 };
  const joyKnobStyle: React.CSSProperties = { position: "absolute", top: "50%", left: "50%", width: 50, height: 50, marginTop: -25, marginLeft: -25, borderRadius: "50%", background: "rgba(255,255,255,0.5)", transition: "transform 0.05s" };
  const hint: React.CSSProperties = { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 11, zIndex: 10 };

  return (
    <div ref={cRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      {!conn && !err && <div style={status}>Connecting...</div>}
      {err && <div style={{ ...status, color: "#f55" }}>Error: {err}</div>}
      
      {/* Top status bar */}
      <div style={topBar}>
        <div>❤️ {char.hp}/{char.maxHp}</div>
        <div>💙 {char.mp}/{char.maxMp}</div>
        <div>⭐ Lv.{char.lvl}</div>
        <div>💰 {char.gold}</div>
      </div>
      
      {/* Skill bar */}
      <div style={skillBar}>
        {skills.slice(0, 4).map(sk => (
          <button key={sk.id} onClick={() => useSkill(sk.id)} disabled={!sk.ready}
            style={{ width: 50, height: 50, background: sk.ready ? "#334" : "#223", border: sk.ready ? "2px solid #44f" : "2px solid #333", borderRadius: 8, color: "#fff", cursor: sk.ready ? "pointer" : "not-allowed", opacity: sk.ready ? 1 : 0.6 }}>
            <span style={{ fontSize: 20 }}>{sk.ico}</span>
            {sk.cd > 0 && <div style={{ fontSize: 8, color: "#f44" }}>{(sk.cd/1000).toFixed(0)}s</div>}
          </button>
        ))}
      </div>
      
      {/* Action buttons */}
      <div style={actionBtns}>
        <button onClick={() => togglePanel('character')} style={actionBtn}>👤</button>
        <button onClick={() => togglePanel('inventory')} style={actionBtn}>🎒</button>
        <button onClick={() => togglePanel('quests')} style={actionBtn}>📜</button>
        <button onClick={() => togglePanel('skills')} style={actionBtn}>✨</button>
        <button onClick={() => togglePanel('chat')} style={actionBtn}>💬</button>
      </div>
      
      {/* Mobile joystick */}
      {showJoy && (
        <div ref={joyBase} onTouchStart={onJoyStart} onTouchMove={onJoyMove} onTouchEnd={onJoyEnd} style={joyBaseStyle}>
          <div ref={joyKnob} style={joyKnobStyle} />
        </div>
      )}
      
      {/* Desktop hint */}
      {!mobile && conn && <div style={hint}>E:Char I:Inv Q:Quest K:Skills C:Chat</div>}
      
      {/* Panel overlay */}
      {renderPanel()}
    </div>
  );
}