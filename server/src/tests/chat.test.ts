import { describe, it, expect, beforeEach } from "vitest";
import { ChatModeration } from "../modules/chat/ChatModeration.js";
import { ChatService } from "../modules/chat/ChatService.js";
import { ChatChannels } from "../modules/chat/ChatChannels.js";

// ---------------------------------------------------------------------------
// ChatModeration
// ---------------------------------------------------------------------------
describe("ChatModeration", () => {
  let mod: ChatModeration;

  beforeEach(() => {
    mod = new ChatModeration();
  });

  it("flags a message containing 'spam'", () => {
    expect(mod.flagMessage("This is spam")).toBe(true);
  });

  it("flags a message containing 'SPAM' (case-insensitive)", () => {
    expect(mod.flagMessage("SPAM everywhere")).toBe(true);
  });

  it("does not flag a normal message", () => {
    expect(mod.flagMessage("Hello, how are you?")).toBe(false);
  });

  it("does not flag an empty string", () => {
    expect(mod.flagMessage("")).toBe(false);
  });

  it("flags when 'spam' appears mid-word", () => {
    expect(mod.flagMessage("nospamhere")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ChatService
// ---------------------------------------------------------------------------
describe("ChatService", () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
  });

  it("sendMessage() returns a message with correct authorId", () => {
    const msg = service.sendMessage("player1", "global", "Hello!");
    expect(msg.authorId).toBe("player1");
  });

  it("sendMessage() returns a message with the correct channel", () => {
    const msg = service.sendMessage("player1", "trade", "WTS sword");
    expect(msg.channel).toBe("trade");
  });

  it("sendMessage() preserves content", () => {
    const msg = service.sendMessage("p2", "local", "Need healer!");
    expect(msg.content).toBe("Need healer!");
  });

  it("sendMessage() includes a createdAt timestamp", () => {
    const before = Date.now();
    const msg = service.sendMessage("p1", "guild", "Ready to raid");
    const after = Date.now();
    expect(msg.createdAt).toBeGreaterThanOrEqual(before);
    expect(msg.createdAt).toBeLessThanOrEqual(after);
  });

  it("two successive messages have non-decreasing timestamps", () => {
    const m1 = service.sendMessage("p1", "global", "first");
    const m2 = service.sendMessage("p1", "global", "second");
    expect(m2.createdAt).toBeGreaterThanOrEqual(m1.createdAt);
  });
});

// ---------------------------------------------------------------------------
// ChatChannels
// ---------------------------------------------------------------------------
describe("ChatChannels", () => {
  it("global channel is moderated", () => {
    expect(ChatChannels.global.moderated).toBe(true);
  });

  it("trade channel is moderated", () => {
    expect(ChatChannels.trade.moderated).toBe(true);
  });

  it("local channel is not moderated", () => {
    expect(ChatChannels.local.moderated).toBe(false);
  });

  it("guild channel is not moderated", () => {
    expect(ChatChannels.guild.moderated).toBe(false);
  });

  it("has exactly four channels", () => {
    expect(Object.keys(ChatChannels)).toHaveLength(4);
  });
});
