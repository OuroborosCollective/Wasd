// @ARE-GUARD-EXEMPT: Infrastructure/Meta/Telemetry logic; not world-state critical.
export class NotificationService {
  notify(playerId: string, message: string) {
    return {
      playerId,
      message,
      createdAt: Date.now()
    };
  }
}