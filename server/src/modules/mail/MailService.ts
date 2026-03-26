export class MailService {
  private mail: any[] = [];

  send(from: string, to: string, subject: string, body: string) {
    const item = { from, to, subject, body, createdAt: Date.now() };
    this.mail.push(item);
    return item;
  }

  inbox(playerId: string) {
    return this.mail.filter(m => m.to === playerId);
  }
}