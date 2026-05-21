// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class ChatService {
  sendMessage(authorId: string, channel: string, content: string) {
    return {
      authorId,
      channel,
      content,
      createdAt: Date.now()
    };
  }
}