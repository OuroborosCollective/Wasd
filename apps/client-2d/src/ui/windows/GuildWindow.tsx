/**
 * Ouroboros GuildWindow — WoW-Style Guild Panel
 * 
 * Displays guild information, member list, and guild level.
 * Follows the Panzerschrank brutalist design aesthetic.
 */

import { useState, useEffect } from "react";
import { useSyncExternalStore } from "react";
import "../inventoryGrid.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GuildMember {
  id: string;
  name: string;
  level: number;
  rank: string;
  online: boolean;
  contribution: number;
}

export interface GuildSnapshot {
  guildId: string;
  guildName: string;
  guildLevel: number;
  memberCount: number;
  maxMembers: number;
  totalContribution: number;
  members: GuildMember[];
}

// ─── State Store ─────────────────────────────────────────────────────────────

class GuildWindowStore {
  private snapshot: GuildSnapshot | null = null;
  private listeners = new Set<() => void>();

  getSnapshot() { return this.snapshot; }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  receiveSnapshot(snap: GuildSnapshot): void {
    this.snapshot = snap;
    this.notify();
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }
}

export const guildWindowStore = new GuildWindowStore();

export function useGuildWindow(): GuildSnapshot | null {
  return useSyncExternalStore(
    (l) => guildWindowStore.subscribe(l),
    () => guildWindowStore.getSnapshot(),
    () => null
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────

const RANK_COLORS: Record<string, string> = {
  leader: "#ffd700",      // Gold
  officer: "#a335ee",    // Purple
  member: "#9d9d9d",     // Gray
  recruit: "#6a7a8a",     // Dark gray
};

const RANK_DISPLAY: Record<string, string> = {
  leader: "Guild Master",
  officer: "Officer",
  member: "Member",
  recruit: "Recruit",
};

// ─── Components ───────────────────────────────────────────────────────────────

interface MemberRowProps {
  member: GuildMember;
}

function MemberRow({ member }: MemberRowProps) {
  const rankColor = RANK_COLORS[member.rank] || RANK_COLORS.member;
  
  return (
    <div className="guild-member-row">
      <div className="guild-member-status" style={{ 
        backgroundColor: member.online ? "#1eff00" : "#4a5a6a" 
      }} />
      <div className="guild-member-info">
        <span className="guild-member-name" style={{ color: rankColor }}>
          {member.name}
        </span>
        <span className="guild-member-rank">{RANK_DISPLAY[member.rank] || member.rank}</span>
      </div>
      <div className="guild-member-level">Lv.{member.level}</div>
      <div className="guild-member-contribution">{member.contribution.toLocaleString()}</div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface GuildWindowProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function GuildWindow({ isOpen = true, onClose }: GuildWindowProps) {
  const snapshot = useGuildWindow();

  // Listen for guild updates
  useEffect(() => {
    const handleNetworkPacket = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.event === "guild_snapshot") {
        guildWindowStore.receiveSnapshot(detail.payload);
      }
    };

    window.addEventListener("wasd:network-packet", handleNetworkPacket);
    return () => window.removeEventListener("wasd:network-packet", handleNetworkPacket);
  }, []);

  if (!isOpen) return null;

  const members = snapshot?.members ?? [];
  const onlineCount = members.filter(m => m.online).length;

  return (
    <div className="wow-inventory-overlay" role="dialog" aria-label="Guild">
      <div className="wow-inventory-header">
        <h2>GUILD</h2>
        {onClose && (
          <button className="wow-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      <div className="guild-content">
        {/* Guild Header */}
        <section className="guild-section guild-header-section">
          <div className="guild-emblem">🏰</div>
          <div className="guild-info">
            <h3 className="guild-name">{snapshot?.guildName ?? "No Guild"}</h3>
            <div className="guild-meta">
              <span>Level {snapshot?.guildLevel ?? 1}</span>
              <span className="guild-separator">|</span>
              <span>{onlineCount}/{members.length} Online</span>
              <span className="guild-separator">|</span>
              <span>Max {snapshot?.maxMembers ?? 50}</span>
            </div>
          </div>
          <div className="guild-total-contribution">
            <span className="guild-contrib-label">Total Contribution</span>
            <span className="guild-contrib-value">
              {snapshot?.totalContribution.toLocaleString() ?? "0"}
            </span>
          </div>
        </section>

        {/* Members List */}
        <section className="guild-section">
          <h3>Members</h3>
          <div className="guild-member-list">
            {members.length === 0 ? (
              <div className="guild-empty-state">No guild members</div>
            ) : (
              members
                .sort((a, b) => {
                  // Sort by rank priority, then by level
                  const rankOrder = { leader: 0, officer: 1, member: 2, recruit: 3 };
                  const rankDiff = (rankOrder[a.rank] ?? 4) - (rankOrder[b.rank] ?? 4);
                  if (rankDiff !== 0) return rankDiff;
                  return b.level - a.level;
                })
                .map(member => (
                  <MemberRow key={member.id} member={member} />
                ))
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="guild-section guild-actions-section">
          <h3>Actions</h3>
          <div className="guild-actions-grid">
            <button className="guild-action-btn" disabled>
              📢 Invite
            </button>
            <button className="guild-action-btn" disabled>
              📜 Guild Info
            </button>
            <button className="guild-action-btn" disabled>
              💰 Treasury
            </button>
            <button className="guild-action-btn" disabled>
              ⚔️ War
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Mount Function ──────────────────────────────────────────────────────────

export function mountGuildWindow(containerId = "guild-mount"): void {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Guild mount point #${containerId} not found`);
    return;
  }

  import("react").then(({ createRoot }) => {
    const root = createRoot(container);
    root.render(<GuildWindow />);
  });
}