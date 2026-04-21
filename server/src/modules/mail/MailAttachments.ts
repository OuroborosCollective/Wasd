import { isItemBoundOrNonTransferable } from "../items/itemBindingPolicy.js";

export class MailAttachments {
  validate(items: any[]) {
    if (!Array.isArray(items) || items.length > 5) return false;
    return items.every((item) => !isItemBoundOrNonTransferable(item));
  }
}