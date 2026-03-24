export class PayloadValidator {
  validateObject(payload: any) {
    return payload !== null && typeof payload === "object";
  }
}