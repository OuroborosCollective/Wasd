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