import { describe, it, expect, beforeEach } from "vitest";
import { GuildSystem } from "../modules/guild/GuildSystem.js";
import { GuildStorage } from "../modules/guild/GuildStorage.js";

// ---------------------------------------------------------------------------
// GuildSystem
// ---------------------------------------------------------------------------
describe("GuildSystem", () => {
  let guilds: GuildSystem;

  beforeEach(() => { guilds = new GuildSystem(); });

  it("createGuild() returns guild with the correct id", () => {
    const guild = guilds.createGuild("g1", "Iron Brotherhood", "p1");
    expect(guild.id).toBe("g1");
  });

  it("createGuild() returns guild with the correct name", () => {
    const guild = guilds.createGuild("g1", "Iron Brotherhood", "p1");
    expect(guild.name).toBe("Iron Brotherhood");
  });

  it("createGuild() sets the correct founderId", () => {
    const guild = guilds.createGuild("g1", "Iron Brotherhood", "p1");
    expect(guild.founderId).toBe("p1");
  });

  it("createGuild() founder is the only initial member", () => {
    const guild = guilds.createGuild("g1", "Heroes", "alice");
    expect(guild.members).toEqual(["alice"]);
  });

  it("createGuild() founder has rank 'founder'", () => {
    const guild = guilds.createGuild("g1", "Heroes", "alice");
    expect(guild.ranks["alice"]).toBe("founder");
  });

  it("addMember() adds a player to the guild's members", () => {
    guilds.createGuild("g1", "Heroes", "alice");
    const guild = guilds.addMember("g1", "bob");
    expect(guild.members).toContain("bob");
  });

  it("addMember() assigns rank 'member' to the new player", () => {
    guilds.createGuild("g1", "Heroes", "alice");
    const guild = guilds.addMember("g1", "bob");
    expect(guild.ranks["bob"]).toBe("member");
  });

  it("addMember() returns null for non-existent guild", () => {
    expect(guilds.addMember("nonexistent", "bob")).toBeNull();
  });

  it("addMember() preserves existing members", () => {
    guilds.createGuild("g1", "Warriors", "founder");
    guilds.addMember("g1", "member1");
    const guild = guilds.addMember("g1", "member2");
    expect(guild.members).toContain("founder");
    expect(guild.members).toContain("member1");
    expect(guild.members).toContain("member2");
  });

  it("multiple guilds can exist independently", () => {
    guilds.createGuild("g1", "Guild A", "p1");
    guilds.createGuild("g2", "Guild B", "p2");
    guilds.addMember("g1", "p3");
    const g2Members = guilds.addMember("g2", "p4")!.members;
    expect(g2Members).not.toContain("p3");
  });
});

// ---------------------------------------------------------------------------
// GuildStorage
// ---------------------------------------------------------------------------
describe("GuildStorage", () => {
  let storage: GuildStorage;

  beforeEach(() => { storage = new GuildStorage(); });

  it("getItems() returns empty array for unknown guild", () => {
    expect(storage.getItems("g1")).toEqual([]);
  });

  it("addItem() stores an item and returns the updated list", () => {
    const list = storage.addItem("g1", { id: "iron_ore" });
    expect(list).toEqual(expect.arrayContaining([expect.objectContaining({ id: "iron_ore" })]));
  });

  it("getItems() retrieves items after addItem()", () => {
    storage.addItem("g1", { id: "gold_ingot" });
    expect(storage.getItems("g1")).toHaveLength(1);
  });

  it("addItem() creates storage for a new guild automatically", () => {
    storage.addItem("g2", { id: "potion" });
    expect(storage.getItems("g2")).toHaveLength(1);
  });

  it("multiple items can be stored for a guild", () => {
    storage.addItem("g1", { id: "sword" });
    storage.addItem("g1", { id: "shield" });
    storage.addItem("g1", { id: "helmet" });
    expect(storage.getItems("g1")).toHaveLength(3);
  });

  it("storage is isolated between guilds", () => {
    storage.addItem("g1", { id: "g1_item" });
    storage.addItem("g2", { id: "g2_item" });
    expect(storage.getItems("g1").map((i: any) => i.id)).not.toContain("g2_item");
    expect(storage.getItems("g2").map((i: any) => i.id)).not.toContain("g1_item");
  });
});
