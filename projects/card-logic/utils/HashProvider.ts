import { createHash } from 'crypto';

export class HashProvider {
    /**
     * Erzeugt einen deterministischen SHA-256 Hex-Hash aus einem String.
     * @param input Der zu hashende String.
     * @returns Der resultierende Hex-Hash.
     */
    public static hash(input: string): string {
        return createHash('sha256')
            .update(input)
            .digest('hex');
    }
}