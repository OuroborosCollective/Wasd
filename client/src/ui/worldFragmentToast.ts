type FragmentSummary = { id: string; title?: { de?: string; en?: string } };

type FragmentsResponse = {
  kind?: string;
  fragments?: FragmentSummary[];
};

function pickLang(): "de" | "en" {
  try {
    const lang = (navigator.language || "en").toLowerCase();
    return lang.startsWith("de") ? "de" : "en";
  } catch {
    return "en";
  }
}

function fragmentTitle(frag: FragmentSummary, lang: "de" | "en"): string {
  const t = frag.title;
  if (!t || typeof t !== "object") return frag.id;
  const primary = lang === "de" ? t.de : t.en;
  if (typeof primary === "string" && primary.trim()) return primary.trim();
  if (typeof t.de === "string" && t.de.trim()) return t.de.trim();
  if (typeof t.en === "string" && t.en.trim()) return t.en.trim();
  return frag.id;
}

/**
 * After game welcome: fetch `/api/lore/fragments` and show one random Weltenfragment as a toast.
 * Safe no-op on network/CORS failure (e.g. client-only Vite dev on another origin).
 */
export async function showRandomWorldFragmentToast(showToast: (text: string, ms?: number) => void): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/lore/fragments", { credentials: "same-origin" });
  } catch {
    return;
  }
  if (!res.ok) return;
  let data: FragmentsResponse;
  try {
    data = (await res.json()) as FragmentsResponse;
  } catch {
    return;
  }
  const list = Array.isArray(data.fragments) ? data.fragments : [];
  if (list.length === 0) return;
  const lang = pickLang();
  const frag = list[Math.floor(Math.random() * list.length)];
  if (!frag?.id) return;
  const title = fragmentTitle(frag, lang);
  const line2 =
    lang === "de"
      ? "Ein Weltenfragment flüstert dir zu… (Lore unter /api/lore/fragments)"
      : "A world fragment whispers to you… (lore at /api/lore/fragments)";
  showToast(`Weltenfragment: ${title}\n${line2}`, 6500);
}
