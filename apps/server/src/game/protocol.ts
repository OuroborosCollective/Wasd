export const SERVER_PROTOCOL_VERSION = 5 as const;

export interface ServerEnvelope<TType extends string, TPayload> {
  type: TType;
  protocolVersion: typeof SERVER_PROTOCOL_VERSION;
  payload: TPayload;
  t: number;
}

export function envelope<TType extends string, TPayload>(
  type: TType,
  payload: TPayload
): ServerEnvelope<TType, TPayload> {
  return {
    type,
    protocolVersion: SERVER_PROTOCOL_VERSION,
    payload,
    t: Date.now()
  };
}

export function safeJsonParse(raw: unknown): unknown {
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}