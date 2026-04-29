export class RealityValidator {
    private static instance: RealityValidator;
    private _isValid: boolean = true;

    private constructor() {}

    public static getInstance(): RealityValidator {
        if (!RealityValidator.instance) {
            RealityValidator.instance = new RealityValidator();
        }
        return RealityValidator.instance;
    }

    public async verifyStateIntegrity(stateHash: string): Promise<boolean> {
        try {
            const seed = (window as any).global_deterministic_seed;
            if (seed === undefined || seed === null) {
                this._isValid = false;
                return false;
            }

            const encoder = new TextEncoder();
            const data = encoder.encode(String(seed));
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            this._isValid = (computedHash === stateHash);
            return this._isValid;
        } catch (e) {
            this._isValid = false;
            return false;
        }
    }

    public get isValid(): boolean {
        return this._isValid;
    }
}

export const realityValidator = RealityValidator.getInstance();