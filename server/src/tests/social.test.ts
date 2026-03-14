import { describe, it, expect, beforeEach } from "vitest";
import { FriendsSystem } from "../modules/social/FriendsSystem.js";
import { IgnoreSystem } from "../modules/social/IgnoreSystem.js";
import { PartySystem } from "../modules/social/PartySystem.js";
import { GroupFinder } from "../modules/social/GroupFinder.js";

// ---------------------------------------------------------------------------
// FriendsSystem
// ---------------------------------------------------------------------------
describe("FriendsSystem", () => {
  let friends: FriendsSystem;

  beforeEach(() => { friends = new FriendsSystem(); });

  it("list() returns empty array for unknown player", () => {
    expect(friends.list("p1")).toEqual([]);
  });

  it("addFriend() makes each player appear in the other's list (bidirectional)", () => {
    friends.addFriend("p1", "p2");
    expect(friends.list("p1")).toContain("p2");
    expect(friends.list("p2")).toContain("p1");
  });

  it("adding the same friend twice does not duplicate entries", () => {
    friends.addFriend("p1", "p2");
    friends.addFriend("p1", "p2");
    const list = friends.list("p1");
    expect(list.filter((id) => id === "p2")).toHaveLength(1);
  });

  it("list() returns an array (spread from Set)", () => {
    friends.addFriend("a", "b");
    expect(Array.isArray(friends.list("a"))).toBe(true);
  });

  it("player can have multiple friends", () => {
    friends.addFriend("p1", "p2");
    friends.addFriend("p1", "p3");
    expect(friends.list("p1")).toContain("p2");
    expect(friends.list("p1")).toContain("p3");
  });

  it("friend lists are independent per player", () => {
    friends.addFriend("p1", "p2");
    friends.addFriend("p3", "p4");
    expect(friends.list("p1")).not.toContain("p4");
    expect(friends.list("p3")).not.toContain("p2");
  });
});

// ---------------------------------------------------------------------------
// IgnoreSystem
// ---------------------------------------------------------------------------
describe("IgnoreSystem", () => {
  let ignore: IgnoreSystem;

  beforeEach(() => { ignore = new IgnoreSystem(); });

  it("list() returns empty array for player with no ignores", () => {
    expect(ignore.list("p1")).toEqual([]);
  });

  it("add() stores an ignore relationship", () => {
    ignore.add("p1", "p2");
    expect(ignore.list("p1")).toContain("p2");
  });

  it("ignore is one-directional — p2 does not ignore p1 automatically", () => {
    ignore.add("p1", "p2");
    expect(ignore.list("p2")).not.toContain("p1");
  });

  it("adding the same ignore twice does not duplicate it", () => {
    ignore.add("p1", "badactor");
    ignore.add("p1", "badactor");
    const list = ignore.list("p1");
    expect(list.filter((id) => id === "badactor")).toHaveLength(1);
  });

  it("player can ignore multiple players", () => {
    ignore.add("p1", "troll1");
    ignore.add("p1", "troll2");
    expect(ignore.list("p1")).toContain("troll1");
    expect(ignore.list("p1")).toContain("troll2");
  });

  it("ignore lists are independent per player", () => {
    ignore.add("p1", "p3");
    ignore.add("p2", "p4");
    expect(ignore.list("p1")).not.toContain("p4");
    expect(ignore.list("p2")).not.toContain("p3");
  });
});

// ---------------------------------------------------------------------------
// PartySystem
// ---------------------------------------------------------------------------
describe("PartySystem", () => {
  let party: PartySystem;

  beforeEach(() => { party = new PartySystem(); });

  it("createParty() sets the correct leaderId", () => {
    const p = party.createParty("leader1");
    expect(p.leaderId).toBe("leader1");
  });

  it("createParty() starts with leader as the only member", () => {
    const p = party.createParty("leader1");
    expect(p.members).toEqual(["leader1"]);
  });

  it("createParty() includes a createdAt timestamp", () => {
    const before = Date.now();
    const p = party.createParty("leader1");
    const after = Date.now();
    expect(p.createdAt).toBeGreaterThanOrEqual(before);
    expect(p.createdAt).toBeLessThanOrEqual(after);
  });

  it("createParty() creates separate party objects each call", () => {
    const p1 = party.createParty("l1");
    const p2 = party.createParty("l2");
    expect(p1).not.toBe(p2);
    expect(p1.leaderId).toBe("l1");
    expect(p2.leaderId).toBe("l2");
  });
});

// ---------------------------------------------------------------------------
// GroupFinder
// ---------------------------------------------------------------------------
describe("GroupFinder", () => {
  let groupFinder: GroupFinder;

  beforeEach(() => { groupFinder = new GroupFinder(); });

  it("createListing() returns the correct ownerId", () => {
    const listing = groupFinder.createListing("player1", "dungeon_run");
    expect(listing.ownerId).toBe("player1");
  });

  it("createListing() returns the correct activity", () => {
    const listing = groupFinder.createListing("player1", "pvp");
    expect(listing.activity).toBe("pvp");
  });

  it("createListing() includes a createdAt timestamp", () => {
    const before = Date.now();
    const listing = groupFinder.createListing("p1", "raid");
    const after = Date.now();
    expect(listing.createdAt).toBeGreaterThanOrEqual(before);
    expect(listing.createdAt).toBeLessThanOrEqual(after);
  });

  it("createListing() creates distinct objects for different calls", () => {
    const l1 = groupFinder.createListing("p1", "questing");
    const l2 = groupFinder.createListing("p2", "trading");
    expect(l1).not.toBe(l2);
    expect(l1.activity).toBe("questing");
    expect(l2.activity).toBe("trading");
  });
});
