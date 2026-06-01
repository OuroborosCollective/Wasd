export class NotificationService {
  notify(playerId: string, message: string) {
    return {
      playerId,
      message,
      createdAt: 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */
    };
  }
}