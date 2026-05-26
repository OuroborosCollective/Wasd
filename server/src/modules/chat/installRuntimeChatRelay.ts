import { WorldTick } from "../../core/WorldTick.js";

const installed = Symbol.for("areloria.runtimeChatRelay");

export function installRuntimeChatRelay(): void {
  const proto = WorldTick.prototype as any;
  if (proto[installed]) return;
  proto[installed] = true;

  const start = proto.start;
  const stop = proto.stop;

  proto.start = function (...args: unknown[]) {
    const result = start.apply(this, args);
    if (this.__runtimeChatRelay) return result;
    this.__runtimeChatRelay = setInterval(() => {
      const drain = this.npcSystem?.drainWorldChatEvents;
      if (typeof drain !== "function") return;
      for (const event of drain.call(this.npcSystem) ?? []) {
        const text = String(event?.text ?? "").trim();
        if (!text) continue;
        const channel = String(event?.channel ?? "global");
        const senderName = String(event?.senderName ?? event?.senderId ?? "Unknown");
        const ts = Number.isFinite(Number(event?.ts)) ? Number(event.ts) : Date.now();
        this.ws?.broadcast?((È\Nˆ˜Ú]ÛY\ÜØYÙH‹Ú[›™[ØÛÜNˆÚ[›™[Ù[™\ˆÙ[™\“˜[YKÙ[™\“˜[YK^Ë[Y\İ[\ˆË\ÔŞ\İ[Nˆ˜[ÙK›ÛNˆœ^Y\ˆˆJNÂˆBˆKL
NÂˆ™]\›ˆ™\İ[ÂˆNÂ‚ˆ›İËœİÜH[˜İ[Ûˆ
‹‹˜\™ÜÎˆ[šÛ›İÛ–×JHÂˆYˆ
\Ë—×Ü[[YPÚ]™[^JHÂˆÛX\’[\˜[
\Ë—×Ü[[YPÚ]™[^JNÂˆ\Ë—×Ü[[YPÚ]™[^HH[ÂˆBˆ™]\›ˆİÜ˜\J\Ë\™ÜÊNÂˆNÂŸB