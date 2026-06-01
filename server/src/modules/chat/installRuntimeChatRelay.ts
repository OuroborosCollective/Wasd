import { WorldTick } from "../../core/WorldTick.js";

const installed = Symbol.for("areloria.runtimeRelay");
const relayTimers = new WeakMap<object, ReturnType<typeof setInterval>>();

export function installRuntimeChatRelay(): void {
  const proto = WorldTick.prototype as any;
  if (proto[installed]) return;
  proto[installed] = true;

  const start = proto.start;
  const stop = proto.stop;

  proto.start = function (...args: unknown[]) {
    const result = start.apply(this, args);
    if (relayTimers.has(this)) return result;

    const timer = setInterval(() => {
      const drain = this.npcSystem?.drainWorldChatEvents;
      if (typeof drain !== "function") return;

      const events = drain.call(this.npcSystem) ?? [];
      for (const event of events) {
        const text = String(event?.text ?? "").trim();
        if (!text) continue;

        const channel = String(event?.channel ?? "global");
        const senderName = String(event?.senderName ?? event?.senderId ?? "Unknown");
        const ts = Number.isFinite(Number(event?.ts)) ? Number(event.ts) : 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;

        this.ws?.broadcast?.({
          type: "chat_message",
          channel,
          scope: channel,
          sender: senderName,
          senderName,
          text,
          ts,
          timestamp: ts,
          isSystem: false,
          role: "player",
        });
      }
    }, 100);

    relayTimers.set(this, timer);
    return result;
  };

  proto.stop = function (...args: unknown[]) {
    const timer = relayTimers.get(this);
    if (timer) {
      clearInterval(timer);
      relayTimers.delete(this);
    }
    return stop.apply(this, args);
  };
}
