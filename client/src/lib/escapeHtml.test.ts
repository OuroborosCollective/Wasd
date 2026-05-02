import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapes special HTML characters", () => {
    expect(escapeHtml("&")).toBe("&amp;");
    expect(escapeHtml("<")).toBe("&lt;");
    expect(escapeHtml(">")).toBe("&gt;");
    expect(escapeHtml('"')).toBe("&quot;");
    expect(escapeHtml("'")).toBe("&#x27;");
  });

  it("escapes a string with multiple special characters", () => {
    const input = '<div class="test">Hello & "World" \u0027Areloria\u0027</div>';
    const expected = "&lt;div class=&quot;test&quot;&gt;Hello &amp; &quot;World&quot; &#x27;Areloria&#x27;&lt;/div&gt;";
    expect(escapeHtml(input)).toBe(expected);
  });

  it("returns the same string if no special characters are present", () => {
    const input = "Hello World 123";
    expect(escapeHtml(input)).toBe(input);
  });

  it("handles empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles non-string inputs by converting them to string first", () => {
    // @ts-ignore - testing runtime behavior for non-string inputs
    expect(escapeHtml(null)).toBe("null");
    // @ts-ignore
    expect(escapeHtml(undefined)).toBe("undefined");
    // @ts-ignore
    expect(escapeHtml(123)).toBe("123");
  });

  it("escapes multiple occurrences of the same character", () => {
    expect(escapeHtml("&&&")).toBe("&amp;&amp;&amp;");
    expect(escapeHtml("<<<")).toBe("&lt;&lt;&lt;");
  });
});
