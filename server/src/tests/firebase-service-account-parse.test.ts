import { describe, it, expect } from "vitest";
import { parseServiceAccountFromEnv } from "../config/firebase.js";

describe("parseServiceAccountFromEnv", () => {
  it("parses JSON object string", () => {
    const j = { project_id: "p1", private_key: "x", client_email: "a@b.c" };
    const r = parseServiceAccountFromEnv(JSON.stringify(j));
    expect(r?.project_id).toBe("p1");
  });

  it("parses base64-encoded JSON", () => {
    const j = { project_id: "p2", private_key: "k", client_email: "a@b.c" };
    const b64 = Buffer.from(JSON.stringify(j), "utf8").toString("base64");
    const r = parseServiceAccountFromEnv(b64);
    expect(r?.project_id).toBe("p2");
  });
});
