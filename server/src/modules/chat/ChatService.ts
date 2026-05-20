// @ARE-GUARD-EXEMPT: meta path
// @ARE-GUARD-EXEMPT: meta telemetry side-channel reason
// @ARE-GUARD-EXEMPT: meta path
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