export class ChatService {
  sendMessage(authorId: string, channel: string, content: string) {
    return {
      authorId,
      channel,
      content,
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}