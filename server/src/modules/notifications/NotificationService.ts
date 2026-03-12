export class NotificationService {
  notify(playerId: string, message: string) {
    return {
      playerId,
      message,
      createdAt: Date.now()
    };
  }
}