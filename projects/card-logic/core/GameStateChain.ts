import { createHash } from 'crypto';
import { AREStateCompiler } from './AREStateCompiler';

export class GameStateChain {
    /**
     * Validiert den Spielzustand gegen einen empfangenen Hash.
     * Nutzt den AREStateCompiler zur Generierung des Zustands-Fingerprints.
     * 
     * @param gameState - Das aktuelle GameState-Objekt
     * @param receivedHash - Der zu prüfende Hash (Client/Peer-seitig)
     * @throws Error - Wenn die Hashes nicht übereinstimmen (Anti-Cheat-Logik)
     * @returns boolean - true bei erfolgreicher Validierung
     */
    public static validateMove(gameState: any, receivedHash: string): boolean {
        const compiledResult = AREStateCompiler.compile(gameState);
        const fingerprint = compiledResult;
        
        const calculatedHash = createHash('sha256')
            .update(fingerprint)
            .digest('hex');

        if (calculatedHash !== receivedHash) {
            throw new Error(`Anti-Cheat-Validation Error: Discrepancy detected between local state and received hash. Hash mismatch.`);
        }

        return true;
    }
}