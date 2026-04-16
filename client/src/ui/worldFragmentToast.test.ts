import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { showRandomWorldFragmentToast } from "./worldFragmentToast";

describe("showRandomWorldFragmentToast", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
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
  });

  it("shows a toast with a fragment title when fetch succeeds", async () => {
    const toasts: string[] = [];
    await showRandomWorldFragmentToast((t) => toasts.push(t));
    expect(toasts.length).toBe(1);
    expect(toasts[0]).toMatch(/Weltenfragment:/);
    expect(toasts[0]).toMatch(/Titel [AB]|Title [AB]/);
  });

  it("no toast when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const toasts: string[] = [];
    await showRandomWorldFragmentToast((t) => toasts.push(t));
    expect(toasts.length).toBe(0);
  });
});
