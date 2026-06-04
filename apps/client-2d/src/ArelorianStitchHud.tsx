import { FormEvent, useEffect, useMemo, useState } from "react";
import { InventoryPanel, type InventoryItem } from "./ui/InventoryPanel";

type Msg = { from: string; txt: string };
type HudPanel = "inventory" | "character" | "map" | "combat" | "guild" | "factions" | "quests" | null;
type HudOverlay = "vitals" | "radar" | "chat";

export interface ArelorianStitchHudProps {
  connected: boolean;
  assetStatus: string;
  weaponCount: number;
  equippedWeaponId?: string | null;
  inventoryItems?: InventoryItem[];
  playerName: string;
  messages: Msg[];
  onSkill: (skillId: string) => void;
  onChat: (text: string) => void;
  onInteract: () => void;
  onStrike?: () => void;
  onEquipWeapon?: (item: InventoryItem) => void;
  onCycleWeapon?: () => void;
  onToggleAutoMove?: () => void;
  // DEBUG: Player position & chunk visibility tracking
  debugPlayerPos?: { x: number; z: number };
  debugChunkCoords?: { chunkX: number; chunkZ: number };
  debugVisibleChunks?: number | null;
  debugHeartbeatReceived?: boolean;
  debugInitialized?: boolean;
  // DEBUG: Additional runtime values
  debugNetworkStatus?: "connected" | "disconnected" | "waiting";
  debugServerTick?: number | null;
  debugAckSeq?: number | null;
  debugIdentity?: string | null;
  debugCharacter?: string | null;
}

const skills = [
  { id: "atk", key: "1", icon: "⚔", label: "Strike", cost: "STA 4" },
  { id: "def", key: "2", icon: "🛡", label: "Guard", cost: "MANA +" },
  { id: "mag", key: "3", icon: "✦", label: "Aether", cost: "MANA 12" },
  { id: "talk", key: "E", icon: "☉", label: "Talk", cost: "SYNC" },
];

const panels: { id: Exclude<HudPanel, null>; label: string; icon: string; shortcut: string }[] = [
  { id: "inventory", label: "Inventory", icon: "◇", shortcut: "i" },
  { id: "character", label: "Skills", icon: "⬢", shortcut: "k" },
  { id: "combat", label: "Matrix", icon: "✕", shortcut: "c" },
  { id: "map", label: "Map", icon: "◌", shortcut: "m" },
  { id: "guild", label: "Guild", icon: "♜", shortcut: "g" },
  { id: "factions", label: "Factions", icon: "⚖", shortcut: "f" },
  { id: "quests", label: "Quests", icon: "!", shortcut: "q" },
];

const overlays: { id: HudOverlay; label: string; short: string }[] = [
  { id: "vitals", label: "Vitals", short: "HP" },
  { id: "radar", label: "Radar", short: "MAP" },
  { id: "chat", label: "Chat", short: "CHAT" },
];

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || Boolean((target as HTMLElement | null)?.isContentEditable);
}

async function requestFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
    return;
  }
  await root.requestFullscreen?.();
}

export function ArelorianStitchHud({
  connected,
  assetStatus,
  weaponCount,
  equippedWeaponId,
  inventoryItems = [],
  playerName,
  messages,
  onSkill,
  onChat,
  onInteract,
  onStrike,
  onEquipWeapon,
  onCycleWeapon,
  onToggleAutoMove,
  // DEBUG props
  debugPlayerPos,
  debugChunkCoords,
  debugVisibleChunks,
  debugHeartbeatReceived,
  debugInitialized,
  debugNetworkStatus,
  debugServerTick,
  debugAckSeq,
  debugIdentity,
  debugCharacter,
}: ArelorianStitchHudProps) {
  const [activePanel, setActivePanel] = useState<HudPanel>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [openOverlays, setOpenOverlays] = useState<Record<HudOverlay, boolean>>({ vitals: false, radar: false, chat: false });
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [chatText, setChatText] = useState("");
  const hp = 86;
  const mana = 64;
  const stamina = 78;
  const xp = 31;

  const visibleMessages = useMemo(() => messages.slice(-6), [messages]);
  const hudClasses = [
    "stitch-hud",
    openOverlays.vitals ? "show-vitals" : "",
    openOverlays.radar ? "show-radar" : "",
    openOverlays.chat ? "show-chat" : "",
  ].filter(Boolean).join(" ");

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        setActivePanel(null);
        setIsInventoryOpen(false);
        setOpenOverlays({ vitals: false, radar: false, chat: false });
        return;
      }
      if (event.key.toLowerCase() === "h") {
        setOpenOverlays((current) => ({ ...current, vitals: !current.vitals }));
        return;
      }
      if (event.key.toLowerCase() === "enter") {
        setOpenOverlays((current) => ({ ...current, chat: true }));
        return;
      }
      const panel = panels.find((p) => p.shortcut === event.key.toLowerCase());
      if (!panel) return;
      event.preventDefault();
      if (panel.id === "inventory") {
        toggleInventory();
        return;
      }
      setActivePanel((current) => (current === panel.id ? null : panel.id));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleInventory() {
    setIsInventoryOpen((current) => {
      const next = !current;
      setActivePanel(next ? "inventory" : null);
      return next;
    });
  }

  function toggleOverlay(overlay: HudOverlay) {
    setOpenOverlays((current) => ({ ...current, [overlay]: !current[overlay] }));
  }

  function selectPanel(panel: Exclude<HudPanel, null>) {
    if (panel === "inventory") {
      toggleInventory();
      return;
    }
    setIsInventoryOpen(false);
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function closePanel() {
    setActivePanel(null);
    setIsInventoryOpen(false);
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    onChat(text);
    setChatText("");
  }

  function handleSkill(id: string) {
    if (id === "talk") onInteract();
    else if (id === "atk" && onStrike) onStrike();
    else onSkill(id);
  }

  return (
    <div className={hudClasses} aria-label="Arelorian Science MMO HUD">
      <div className="stitch-scanlines" aria-hidden="true" />

      <header className="stitch-topbar" role="banner">
        <div className="stitch-brand">
          <span className="stitch-kicker">ARELORIAN SCIENCE // 2.5D PIXEL CLIENT</span>
          <strong>Millbrook Observer Node</strong>
        </div>
        <div className="stitch-node-status" role="status" aria-live="polite">
          <span className={connected ? "stitch-live-dot on" : "stitch-live-dot"} />
          <b>{connected ? "WORLD ONLINE" : "SYNCING"}</b>
          <small>{assetStatus} · {weaponCount} WEAPONS</small>
        </div>
      </header>

      <nav className="stitch-mobile-toggles" aria-label="HUD Quick Toggles">
        {overlays.map((overlay) => (
          <button
            key={overlay.id}
            type="button"
            className={openOverlays[overlay.id] ? "active" : ""}
            onClick={() => toggleOverlay(overlay.id)}
            aria-pressed={openOverlays[overlay.id]}
            title={overlay.label}
          >
            {overlay.short}
          </button>
        ))}
      </nav>

      <button className="stitch-fullscreen-toggle" type="button" onClick={() => requestFullscreen().catch(() => undefined)} aria-pressed={isFullscreen}>
        {isFullscreen ? "EXIT" : "FULL"}
      </button>

      <aside className="stitch-vitals" aria-label="Player Vital Stats">
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

      {/* DEBUG HUD: Player Position & Chunk Visibility */}
      <aside className="stitch-debug" aria-label="Debug: Player Position & Chunk Tracking">
        <div className="stitch-debug-title">POSITION DEBUG</div>
        <div className="stitch-debug-row">
          <span>Network:</span>
          <span className={debugNetworkStatus === "connected" ? "ok" : debugNetworkStatus === "disconnected" ? "error" : "warn"}>
            {debugNetworkStatus ?? "waiting"}
          </span>
        </div>
        <div className="stitch-debug-row">
          <span>Heartbeat:</span>
          <span className={debugHeartbeatReceived ? "ok" : "warn"}>{debugHeartbeatReceived ? "OK" : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Initialized:</span>
          <span className={debugInitialized ? "ok" : "warn"}>{debugInitialized ? "YES" : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Player Pos:</span>
          <span>{debugPlayerPos ? `${debugPlayerPos.x.toFixed(0)}, ${debugPlayerPos.z.toFixed(0)}` : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Chunk Coords:</span>
          <span>{debugChunkCoords ? `${debugChunkCoords.chunkX}, ${debugChunkCoords.chunkZ}` : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Visible Chunks:</span>
          <span>{debugVisibleChunks != null ? debugVisibleChunks : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Server Tick:</span>
          <span>{debugServerTick != null ? debugServerTick : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Ack Seq:</span>
          <span>{debugAckSeq != null ? debugAckSeq : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Identity:</span>
          <span>{debugIdentity ? debugIdentity.slice(0, 8) + "..." : "waiting"}</span>
        </div>
        <div className="stitch-debug-row">
          <span>Character:</span>
          <span>{debugCharacter ?? "waiting"}</span>
        </div>
      </aside>

      <aside className="stitch-side-menu" aria-label="Game Menus">
        {panels.map((panel) => (
          <button
            key={panel.id}
            className={activePanel === panel.id ? "active" : ""}
            onClick={() => selectPanel(panel.id)}
            title={`${panel.label} [${panel.shortcut.toUpperCase()}]`}
            aria-pressed={activePanel === panel.id}
          >
            <span>{panel.icon}</span>
            <small>{panel.label}</small>
          </button>
        ))}
      </aside>

      <section className="stitch-radar" aria-label="Radar Sensor">
        <div className="stitch-radar-ring"><i /><i /><i /></div>
        <div>
          <b>ARE Pulse</b>
          <small>10Hz deterministic mesh</small>
        </div>
      </section>

      <section className="stitch-chat" aria-label="Chat and Oracle Feed">
        <div className="stitch-panel-title"><b>Local / Oracle Feed</b><span>live</span></div>
        <div className="stitch-chat-lines" role="log" aria-live="polite">
          {visibleMessages.map((message, index) => (
            <p key={`${message.from}-${index}`}><b>{message.from}</b> {message.txt}</p>
          ))}
        </div>
        <form onSubmit={submitChat} className="stitch-chat-input">
          <input value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="Send local message…" aria-label="Chat input" />
          <button type="submit">SEND</button>
        </form>
      </section>

      <nav className="stitch-skillbar" aria-label="Skill Bar">
        {skills.map((skill) => (
          <button key={skill.id} onClick={() => handleSkill(skill.id)} aria-label={`${skill.label} skill`}>
            <kbd aria-hidden="true">{skill.key}</kbd>
            <span>{skill.icon}</span>
            <b>{skill.label}</b>
            <small>{skill.cost}</small>
          </button>
        ))}
      </nav>

      <section className="stitch-bottom-right" aria-label="Quick Actions">
        <button onClick={toggleInventory} aria-pressed={isInventoryOpen}>BAG</button>
        <button onClick={onToggleAutoMove}>AUTO</button>
        <button onClick={onInteract}>INTERACT</button>
      </section>

      {activePanel && (activePanel !== "inventory" || isInventoryOpen) && (
        <StitchPanel
          panel={activePanel}
          weaponCount={weaponCount}
          equippedWeaponId={equippedWeaponId}
          inventoryItems={inventoryItems}
          onEquipWeapon={onEquipWeapon}
          onCycleWeapon={onCycleWeapon}
          onClose={closePanel}
        />
      )}
    </div>
  );
}

function Gauge({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`stitch-gauge ${tone}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div><b>{label}</b><span>{value}%</span></div>
      <i style={{ width: `${value}%` }} />
    </div>
  );
}

function StitchPanel({
  panel,
  weaponCount,
  equippedWeaponId,
  inventoryItems,
  onEquipWeapon,
  onCycleWeapon,
  onClose,
}: {
  panel: Exclude<HudPanel, null>;
  weaponCount: number;
  equippedWeaponId?: string | null;
  inventoryItems: InventoryItem[];
  onEquipWeapon?: (item: InventoryItem) => void;
  onCycleWeapon?: () => void;
  onClose: () => void;
}) {
  const title = panelTitle(panel);
  return (
    <div className="stitch-modal" role="dialog" aria-modal="true" aria-labelledby="stitch-modal-title">
      <div className="stitch-modal-card">
        <header>
          <div>
            <small>ARELORIAN SCIENCE MODULE</small>
            <h2 id="stitch-modal-title">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close panel">×</button>
        </header>
        {panel === "inventory" && <InventoryPanel items={inventoryItems} equippedWeaponId={equippedWeaponId} onEquipWeapon={(item) => onEquipWeapon?.(item)} />}
        {panel === "character" && <CharacterPreview />}
        {panel === "combat" && <CombatPreview equippedWeaponId={equippedWeaponId} />}
        {panel === "map" && <MapPreview />}
        {panel === "guild" && <GuildPreview />}
        {panel === "factions" && <FactionsPreview />}
        {panel === "quests" && <QuestPreview />}
        {panel === "inventory" && weaponCount > 0 && <button className="stitch-cycle-fallback" type="button" onClick={onCycleWeapon}>Cycle Gear Visual</button>}
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

function cleanWeaponName(id?: string | null) {
  return id ? id.replace(/[_-]/g, " ") : "none equipped";
}

function CharacterPreview() {
  return <div className="stitch-grid-panel"><Info label="Level" value="1" /><Info label="ARE Sync" value="stable" /><Info label="Class" value="classless" /><Info label="Skill Mode" value="use-based" /></div>;
}
function CombatPreview({ equippedWeaponId }: { equippedWeaponId?: string | null }) {
  return <div className="stitch-grid-panel"><Info label="Tick" value="10Hz" /><Info label="Weapon" value={cleanWeaponName(equippedWeaponId)} /><Info label="Threat" value="low" /><Info label="Warfront" value="cycle-linked" /></div>;
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
