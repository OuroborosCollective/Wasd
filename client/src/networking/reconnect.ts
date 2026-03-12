export function reconnectSocket(factory: () => WebSocket) {
  return factory();
}