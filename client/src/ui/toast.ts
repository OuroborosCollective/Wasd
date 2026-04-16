import { showNotification } from "./notifications";

/** Legacy one-line toast → rich notification stack (info tone). */
export function showToast(text: string, ms = 4500) {
  showNotification(text, "info", { duration: ms });
}
