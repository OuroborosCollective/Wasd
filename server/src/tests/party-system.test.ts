import { describe, it, expect, beforeEach } from "vitest";
import {
  createParty,
  inviteToParty,
  leaveParty,
  getPartyForPlayer,
  getPartyMembers,
  isInSameParty,
  disbandParty,
  isPartyLeader,
  MAX_PARTY_SIZE,
  _resetPartyState,
} from "../modules/party/partySystem.js";

describe("Party System", () => {
  beforeEach(() => {
    _resetPartyState();
  });

  describe("createParty", () => {
    it("creates a party with the leader as the only member", () => {
      const party = createParty("leader1");
      expect(party.leaderId).toBe("leader1");
      expect([...party.members]).toEqual(["leader1"]);
    });

    it("leaves old party when creating a new one", () => {
      createParty("player1");
      const party2 = createParty("player1");
      expect(getPartyForPlayer("player1")?.id).toBe(party2.id);
    });

    it("assigns a unique party id", () => {
      const p1 = createParty("a");
      const p2 = createParty("b");
      expect(p1.id).not.toBe(p2.id);
    });
  });

  describe("inviteToParty", () => {
    it("adds a target to the party", () => {
      createParty("leader");
      const result = inviteToParty("leader", "member1");
      expect(result.ok).toBe(true);
      expect(getPartyMembers("leader")).toContain("member1");
    });

    it("fails if inviter is not in a party", () => {
      const result = inviteToParty("nobody", "target");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("not_in_party");
    });

    it("fails if inviter is not the leader", () => {
      createParty("leader");
      inviteToParty("leader", "member");
      const result = inviteToParty("member", "target");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("not_leader");
    });

    it("fails if party is full", () => {
      createParty("leader");
      for (let i = 1; i < MAX_PARTY_SIZE; i++) {
        inviteToParty("leader", `m${i}`);
      }
      const result = inviteToParty("leader", "overflow");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("party_full");
    });

    it("fails if target is already in a party", () => {
      createParty("leader1");
      inviteToParty("leader1", "shared");
      createParty("leader2");
      const result = inviteToParty("leader2", "shared");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("target_in_party");
    });
  });

  describe("leaveParty", () => {
    it("removes player from the party", () => {
      createParty("leader");
      inviteToParty("leader", "member");
      leaveParty("member");
      expect(getPartyMembers("leader")).not.toContain("member");
      expect(getPartyForPlayer("member")).toBeUndefined();
    });

    it("promotes next member when leader leaves", () => {
      createParty("leader");
      inviteToParty("leader", "member");
      leaveParty("leader");
      const party = getPartyForPlayer("member");
      expect(party?.leaderId).toBe("member");
    });

    it("disbands party when last member leaves", () => {
      const party = createParty("solo");
      leaveParty("solo");
      expect(getPartyForPlayer("solo")).toBeUndefined();
    });

    it("returns false for player not in any party", () => {
      expect(leaveParty("nobody")).toBe(false);
    });
  });

  describe("isInSameParty", () => {
    it("returns true for same-party members", () => {
      createParty("a");
      inviteToParty("a", "b");
      expect(isInSameParty("a", "b")).toBe(true);
    });

    it("returns false for different parties", () => {
      createParty("a");
      createParty("b");
      expect(isInSameParty("a", "b")).toBe(false);
    });

    it("returns false for unpartied players", () => {
      expect(isInSameParty("x", "y")).toBe(false);
    });
  });

  describe("disbandParty", () => {
    it("removes all members from the party", () => {
      createParty("leader");
      inviteToParty("leader", "m1");
      inviteToParty("leader", "m2");
      disbandParty("leader");
      expect(getPartyForPlayer("leader")).toBeUndefined();
      expect(getPartyForPlayer("m1")).toBeUndefined();
      expect(getPartyForPlayer("m2")).toBeUndefined();
    });

    it("fails if not the leader", () => {
      createParty("leader");
      inviteToParty("leader", "member");
      expect(disbandParty("member")).toBe(false);
    });
  });

  describe("isPartyLeader", () => {
    it("returns true for the leader", () => {
      createParty("leader");
      expect(isPartyLeader("leader")).toBe(true);
    });

    it("returns false for a regular member", () => {
      createParty("leader");
      inviteToParty("leader", "member");
      expect(isPartyLeader("member")).toBe(false);
    });
  });
});
