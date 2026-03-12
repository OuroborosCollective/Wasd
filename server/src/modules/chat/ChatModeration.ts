export class ChatModeration {
  flagMessage(content: string) {
    const banned = ["spam"];
    return banned.some(word => content.toLowerCase().includes(word));
  }
}