export class MailAttachments {
  validate(items: any[]) {
    return Array.isArray(items) && items.length <= 5;
  }
}