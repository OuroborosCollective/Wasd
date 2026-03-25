import { describe, it, expect, beforeEach } from "vitest";
import { MailService } from "../modules/mail/MailService.js";
import { MailAttachments } from "../modules/mail/MailAttachments.js";

// ---------------------------------------------------------------------------
// MailService
// ---------------------------------------------------------------------------
describe("MailService", () => {
  let mail: MailService;

  beforeEach(() => { mail = new MailService(); });

  it("send() returns a mail object with correct 'from' field", () => {
    const msg = mail.send("alice", "bob", "Hello", "How are you?");
    expect(msg.from).toBe("alice");
  });

  it("send() returns a mail object with correct 'to' field", () => {
    const msg = mail.send("alice", "bob", "Hello", "How are you?");
    expect(msg.to).toBe("bob");
  });

  it("send() returns a mail object with correct subject", () => {
    const msg = mail.send("alice", "bob", "Quest Complete", "You did it!");
    expect(msg.subject).toBe("Quest Complete");
  });

  it("send() returns a mail object with correct body", () => {
    const msg = mail.send("alice", "bob", "Subject", "Message body here");
    expect(msg.body).toBe("Message body here");
  });

  it("send() includes a createdAt timestamp", () => {
    const before = Date.now();
    const msg = mail.send("a", "b", "s", "b");
    const after = Date.now();
    expect(msg.createdAt).toBeGreaterThanOrEqual(before);
    expect(msg.createdAt).toBeLessThanOrEqual(after);
  });

  it("inbox() returns empty array for player with no mail", () => {
    expect(mail.inbox("nobody")).toHaveLength(0);
  });

  it("inbox() returns only messages addressed to the specified player", () => {
    mail.send("alice", "bob", "Hi", "Hey");
    mail.send("charlie", "alice", "Yo", "Sup");
    expect(mail.inbox("bob")).toHaveLength(1);
    expect(mail.inbox("bob")[0].from).toBe("alice");
  });

  it("inbox() does not include messages addressed to other players", () => {
    mail.send("alice", "bob", "For Bob", "content");
    mail.send("alice", "charlie", "For Charlie", "content");
    expect(mail.inbox("bob")).toHaveLength(1);
    expect(mail.inbox("charlie")).toHaveLength(1);
  });

  it("inbox() returns all messages when multiple senders write to the same recipient", () => {
    mail.send("a", "target", "s1", "b1");
    mail.send("b", "target", "s2", "b2");
    mail.send("c", "target", "s3", "b3");
    expect(mail.inbox("target")).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// MailAttachments
// ---------------------------------------------------------------------------
describe("MailAttachments", () => {
  let attachments: MailAttachments;

  beforeEach(() => { attachments = new MailAttachments(); });

  it("validate() returns true for empty array", () => {
    expect(attachments.validate([])).toBe(true);
  });

  it("validate() returns true for array with 1 item", () => {
    expect(attachments.validate([{ id: "potion" }])).toBe(true);
  });

  it("validate() returns true for array with exactly 5 items", () => {
    const items = [1, 2, 3, 4, 5];
    expect(attachments.validate(items)).toBe(true);
  });

  it("validate() returns false for array with 6 items", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(attachments.validate(items)).toBe(false);
  });

  it("validate() returns false for non-array input (string)", () => {
    expect(attachments.validate("not an array" as any)).toBe(false);
  });

  it("validate() returns false for null input", () => {
    expect(attachments.validate(null as any)).toBe(false);
  });

  it("validate() returns false for object input", () => {
    expect(attachments.validate({} as any)).toBe(false);
  });
});
