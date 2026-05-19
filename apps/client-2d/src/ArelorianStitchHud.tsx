import { FormEvent, useMemo, useState } from "react";

type Msg = { from: string; txt: string };
type HudPanel = "inventory" | "character" | "map" | "combat" | "guild" | "factions" | "quests" | null;

export interface ArelorianStitchHudProps {
  connected: boolean;
  assetStatus: string;
  weaponCount: number;
  playerName: string;
  messages: Msg[];
  onSkill: (skillId: string) => void;
  onChat: (text: string) => void;
  onInteract: () => void;
  onToggleAutoMove?: () => void;
}

const skills = [
  { id: "atk", key: "1", icon: "⚔", label: "Strike", cost: "STA 4" },
  { id: "def", key: "2", icon: "🛡", label: "Guard", cost: "MANA +" },
  { id: "mag", key: "3", icon: "✦", label: "Aether", cost: "MANA 12" },
  { id: "talk", key: "E", icon: "☉", label: "Talk", cost: "SYNC" },
];

const panels: { id: Exclude<HudPanel, null>; label: string; icon: string }[] = [
  { id: "inventory", label: "Inventory", icon: "◇" },
  { id: "character", label: "Skills", icon: "⬢" },
  { id: "combat", label: "Matrix", icon: "✕" },
  { id: "map", label: "Map", icon: "◌" },
  { id: "guild", label: "Guild", icon: "♜" },
  { id: "factions", label: "Factions", icon: "⚖" },
  { id: "quests", label: "Quests", icon: "!" },
];

export function ArelorianStitchHud({
  connected,
  assetStatus,
  weaponCount,
  playerName,
  messages,
  onSkill,
  onChat,
  onInteract,
  onToggleAutoMove,
}: ArelorianStitchHudProps) {
  const [activePanel, setActivePanel] = useState<HudPanel>(null);
  const [chatText, setChatText] = useState("");
  const hp = 86;
  const mana = 64;
  const stamina = 78;
  const xp = 31;

  const visibleMessages = useMemo(() => messages.slice(-6), [messages]);

  function submitChat(event: FormEvent) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    onChat(text);
    setChatText("");
  }

  function handleSkill(id: string) {
    if (id === "talk") onInteract();
    else onSkill(id);
  }

  return (
    <div className="stitch-hud" aria-label="Arelorian Science MMO HUD">
      <div className="stitch-scanlines" />

      <header className="stitch-topbar">
        <div className="stitch-brand">
          <span className="stitch-kicker">ARELORIAN SCIENCE // 2.5D PIXEL CLIENT</span>
          <strong>Millbrook Observer Node</strong>
        </div>
        <div className="stitch-node-status">
          <span className={connected ? "stitch-live-dot on" : "stitch-live-dot"} />
          <b>{connected ? "WORLD ONLINE" : "SYNCING"}</b>
          <small>{assetStatus} · {weaponCount} WEAPONS</small>
        </div>
      </header>

      <aside className="stitch-vitals">
        <div className="stitch-portrait"><span>Ω</span></div>
        <div className="stitch-nameplate">
          <small>Observer</small>
          <strong>{playerName}</strong>
        </div>
        <Gauge label="HP" value={hp} tone="ruby" />
        <Gauge label="MP" value={mana} tone="aether" />
        <Gauge label="STA" value={stamina} tone="emerald" />
        <Gauge label="XP" value={xp} tone="gold" />
      </aside>

      <aside className="stitch-side-menu">
        {panels.map((panel) => (
          <button
            key={panel.id}
            className={activePanel === panel.id ? "active" : ""}
            onClick={() => setActivePanel(activePanel === panel.id ? null : panel.id)}
            title={panel.label}
          >
            <span>{panel.icon}</span>
            <small>{panel.label}</small>
          </button>
        ))}
      </aside>

      <section className="stitch-radar">
        <div className="stitch-radar-ring"><i /><i /><i /></div>
        <div>
          <b>ARE Pulse</b>
          <small>10Hz deterministic mesh</small>
        </div>
      </section>

      <section className="stitch-chat">
        <div className="stitch-panel-title"><b>Local / Oracle Feed</b><span>live</span></div>
        <div className="stitch-chat-lines">
          {visibleMessages.map((message, index) => (
            <p key={`${message.from}-${index}`}><b>{message.from}</b> {message.txt}</p>
          ))}
        </div>
        <form onSubmit={submitChat} className="stitch-chat-input">
          <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Send local message…" />
          <button type="submit">SEND</button>
        </form>
      </section>

      <nav className="stitch-skillbar">
        {skills.map((skill) => (
          <button key={skill.id} onClick={() => handleSkill(skill.id)}>
            <kbd>{skill.key}</kbd>
            <span>{skill.icon}</span>
            <b>{skill.label}</b>
            <small>{skill.cost}</small>
          </button>
        ))}
      </nav>

      <section className="stitch-bottom-right">
        <button onClick={onToggleAutoMove}>AUTO</button>
        <button onClick={onInteract}>INTERACT</button>
      </section>

      {activePanel && <StitchPanel panel={activePanel} weaponCount={weaponCount} onClose={() => setActivePanel(null)} />}
    </div>
  );
}

function Gauge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`stitch-gauge ${tone}`}>
      <div><b>{label}</b><span>{value}%</span></div>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

function StitchPanel({ panel, weaponCount, onClose }: { panel: Exclude<HudPanel, null>; weaponCount: number; onClose: () => void }) {
  const title = panelTitle(panel);
  return (
    <div className="stitch-modal">
      <div className="stitch-modal-card">
        <header>
          <div>
            <small>ARELORIAN SCIENCE MODULE</small>
            <h2>{title}</h2>
          </div>
          <button onClick={onClose}>×</button>
        </header>
        {panel === "inventory" && <InventoryPreview weaponCount={weaponCount} />}
        {panel === "character" && <CharacterPreview />}
        {panel === "combat" && <CombatPreview />}
        {panel === "map" && <MapPreview />}
        {panel === "guild" && <GuildPreview />}
        {panel === "factions" && <FactionsPreview />}
        {panel === "quests" && <QuestPreview />}
      </div>
    </div>
  );
}

function panelTitle(panel: Exclude<HudPanel, null>) {
  return ({
    inventory: "Inventory Matrix",
    character: "Character & Skills",
    combat: "Combat Matrix",
    map: "Arelorian Highlands",
    guild: "Guild Console",
    factions: "Faction Reputation",
    quests: "Quest Log",
  } as const)[panel];
}

function InventoryPreview({ weaponCount }: { weaponCount: number }) {
  return <div className="stitch-grid-panel"><Info label="Weapon Pool" value={`${weaponCount} visuals`} /><Info label="Drop Logic" value="visualId ready" /><Info label="Atlas" value="weapon-atlas.png" /><Info label="Rarity" value="common → mystic" /></div>;
}
function CharacterPreview() {
  return <div className="stitch-grid-panel"><Info label="Level" value="1" /><Info label="ARE Sync" value="stable" /><Info label="Class" value="classless" /><Info label="Skill Mode" value="use-based" /></div>;
}
function CombatPreview() {
  return <div className="stitch-grid-panel"><Info label="Tick" value="10Hz" /><Info label="Target" value="nearest" /><Info label="Threat" value="low" /><Info label="Warfront" value="cycle-linked" /></div>;
}
function MapPreview() {
  return <div className="stitch-map-preview"><span /><span /><span /><span /><b>Millbrook</b></div>;
}
function GuildPreview() {
  return <div className="stitch-grid-panel"><Info label="Guild" value="unclaimed" /><Info label="Village Rights" value="50 members" /><Info label="Treasury" value="offline" /><Info label="Rank" value="observer" /></div>;
}
function FactionsPreview() {
  return <div className="stitch-grid-panel"><Info label="Millbrook" value="neutral" /><Info label="Oracle Circle" value="trusted" /><Info label="Warfront" value="contested" /><Info label="Merchants" value="open" /></div>;
}
function QuestPreview() {
  return <div className="stitch-grid-panel"><Info label="First Steps" value="available" /><Info label="Oracle Echo" value="hidden" /><Info label="Warfront Aid" value="locked" /><Info label="Crafting" value="pending" /></div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <article className="stitch-info"><small>{label}</small><b>{value}</b></article>;
}
