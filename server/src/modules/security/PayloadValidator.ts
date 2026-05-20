// @ARE-GUARD-EXEMPT: non-sim module
export class PayloadValidator {
  validateObject(payload: any) {
    return payload !== null && typeof payload === "object" && !Array.isArray(payload);
  }
}
