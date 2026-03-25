import { describe, it, expect, beforeEach } from "vitest";
import { MailAttachments } from "../modules/mail/MailAttachments.js";

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
