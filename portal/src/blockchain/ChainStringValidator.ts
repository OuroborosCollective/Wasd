
/**
 * ChainStringValidator - Ouroboros Blockchain Bridge (Web3)
 * 
 * Validates digital goods transactions (e.g., warfront_core)
 * using chain string as stateless snapshot.
 */

export interface AssetTransaction {
  assetId: string;
  ownerAddress: string;
  nonce: number;
  chain: string;
  expectedHash: string;
  signature: string;
}

export interface ValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
}

export class ChainStringValidator {
  public static validateDigitalGood(tx: AssetTransaction): ValidationResult {
    if (!tx.assetId || !tx.chain || !tx.expectedHash) {
      return { valid: false, errorCode: 'INVALID_FORMAT', errorMessage: 'Missing fields', timestamp: Date.now() };
    }
    
    // Calculate hash O(1)
    const hash = this.calculateChainHash(tx.chain);
    if (hash !== tx.expectedHash) {
      return { valid: false, errorCode: 'HASH_MISMATCH', errorMessage: 'Hash mismatch', timestamp: Date.now() };
    }
    
    return { valid: true, timestamp: Date.now() };
  }

  public static calculateChainHash(chain: string): string {
    if (!chain) return '';
    let h = BigInt('0xCBF29CE484222325');
    const m = BigInt('0x9E3779B185EBCA87');
    const mask = BigInt('0xFFFFFFFFFFFFFFFF');
    for (let i = 0; i < chain.length; i++) {
      h = (h ^ BigInt(chain.charCodeAt(i))) * m;
      h = (h >> 32n) | (h << 32n);
      h = h & mask;
    }
    return '0x' + (h & mask).toString(16).padStart(16, '0');
  }

  public static parseState(chain: string): Record<string, number> {
    if (!chain) return { open: 0, high: 0, low: 0, close: 0, tickCount: 0, balance: 0 };
    const parts = chain.split('|');
    const state: Record<string, number> = {};
    for (const part of parts) {
      const key = part.charAt(0);
      state[key] = parseInt(part.slice(1)) || 0;
    }
    return { open: state['O'] || 0, high: state['H'] || 0, low: state['L'] || 0, close: state['C'] || 0, tickCount: state['N'] || 0, balance: state['B'] || 0 };
  }
}

export default ChainStringValidator;
