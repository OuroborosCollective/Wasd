export interface ComboResult {
    ok: boolean;
    isValid?: boolean;
    multiplier?: number;
    nextIndex?: number;
}
export class ComboValidator {
    public validate(skill: any, state: any): ComboResult { return { ok: true, isValid: true, multiplier: 1, nextIndex: 0 }; }
}
