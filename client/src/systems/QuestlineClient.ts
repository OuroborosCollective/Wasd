/**
 * Thin client for questline REST API (`/api/questlines`).
 */

export type QuestlineSummary = { id: string; title: string; strandKey: string };

export class QuestlineClient {
  constructor(private baseUrl = "") {}

  private url(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }

  async listSeeds(): Promise<QuestlineSummary[]> {
    const r = await fetch(this.url("/api/questlines/seeds"));
    if (!r.ok) throw new Error(`questlines_seeds_${r.status}`);
    const j = (await r.json()) as { questlines: QuestlineSummary[] };
    return j.questlines ?? [];
  }

  async start(questlineId: string, opts?: { playerId?: string; token?: string }): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts?.playerId) headers["X-Player-Id"] = opts.playerId;
    const r = await fetch(this.url(`/api/questlines/${encodeURIComponent(questlineId)}/start`), {
      method: "POST",
      headers,
    });
    if (!r.ok) throw new Error(`questline_start_${r.status}`);
    return r.json();
  }

  async choose(
    questlineId: string,
    choiceId: string,
    opts?: { playerId?: string; token?: string; flags?: Record<string, boolean> }
  ): Promise<unknown> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts?.playerId) headers["X-Player-Id"] = opts.playerId;
    const r = await fetch(this.url(`/api/questlines/${encodeURIComponent(questlineId)}/choose`), {
      method: "POST",
      headers,
      body: JSON.stringify({ choiceId, flags: opts?.flags ?? {} }),
    });
    if (!r.ok) throw new Error(`questline_choose_${r.status}`);
    return r.json();
  }
}
