export interface StatelessToken {
    token: string;
    index: number;
}

export class StatelessGate {
    private static readonly INFO_CONTEXT = "stateless-gate-v1-authentication";
    private encoder: TextEncoder;

    constructor() {
        this.encoder = new TextEncoder();
    }

    public async generateToken(userSecret: string, logicalIndex: number): Promise<string> {
        const keyMaterial = await this.importKeyMaterial(userSecret);
        const salt = this.encoder.encode(logicalIndex.toString());
        const info = this.encoder.encode(StatelessGate.INFO_CONTEXT);

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: "HKDF",
                hash: "SHA-256",
                salt: salt,
                info: info,
            },
            keyMaterial,
            256
        );

        return this.arrayBufferToHex(derivedBits);
    }

    public async verifyToken(providedToken: string, userSecret: string, logicalIndex: number): Promise<boolean> {
        const expectedToken = await this.generateToken(userSecret, logicalIndex);
        return this.secureCompare(providedToken, expectedToken);
    }

    private async importKeyMaterial(secret: string): Promise<CryptoKey> {
        return await crypto.subtle.importKey(
            "raw",
            this.encoder.encode(secret),
            { name: "HKDF" },
            false,
            ["deriveBits"]
        );
    }

    private arrayBufferToHex(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    private secureCompare(a: string, b: string): boolean {
        if (a.length !== b.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
}