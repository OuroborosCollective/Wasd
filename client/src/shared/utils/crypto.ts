export function hashString(input: string | number): number {
  const str = String(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export function generateColorFromHash(input: string | number): string {
  const hash = hashString(input);
  const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return "#" + "000000".substring(0, 6 - color.length) + color;
}

export function getDeterministicHsla(input: string | number, saturation: number = 70, lightness: number = 50): string {
  const hash = hashString(input);
  const hue = Math.abs(hash) % 360;
  return `hsla(${hue}, ${saturation}%, ${lightness}%, 1)`;
}

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}