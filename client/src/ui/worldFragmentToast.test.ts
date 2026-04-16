/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showRandomWorldFragmentToast } from "./worldFragmentToast";

describe("showRandomWorldFragmentToast", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            kind: "world_fragments",
            fragments: [
              { id: "a", title: { de: "Titel A", en: "Title A" } },
              { id: "b", title: { de: "Titel B", en: "Title B" } },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = origFetch;
    document.body.innerHTML = "";
    document.getElementById("arel-notifications")?.remove();
  });

  it("shows a notification when fetch succeeds", async () => {
    await showRandomWorldFragmentToast();
    const c = document.getElementById("arel-notifications");
    expect(c).toBeTruthy();
    expect(c?.textContent).toMatch(/Weltenfragment|World fragment/);
    expect(c?.textContent).toMatch(/Titel [AB]|Title [AB]/);
  });

  it("no notification when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    await showRandomWorldFragmentToast();
    expect(document.getElementById("arel-notifications")).toBeFalsy();
  });
});
