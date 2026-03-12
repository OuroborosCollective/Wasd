export class PacketRouter {
  route(packet: any) {
    return {
      handled: true,
      type: packet?.type ?? "unknown"
    };
  }
}