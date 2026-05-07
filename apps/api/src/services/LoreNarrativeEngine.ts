import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

export type TechnicalImpact = 'feat' | 'fix' | 'refactor' | 'chore' | 'docs' | 'perf' | 'style' | 'test';

export interface LoreInput {
  type: TechnicalImpact;
  scope?: string;
  subject: string;
  body?: string;
  author: string;
  hash?: string;
}

export interface LoreOutput {
  id: string;
  title: string;
  narrative: string;
  category: string;
  recordedAt: Date;
  chronicler: string;
  metadata: {
    originHash?: string;
    impactLevel: number;
    seedChain: string;
  };
}

export class LoreNarrativeEngine {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private readonly loreTemplates: Record<TechnicalImpact, string[]> = {
    feat: [
      'Ein neues Wunder manifestierte sich in den Hallen von {scope}.',
      'Die Arkanisten entdeckten eine neue Form der Magie: {subject}.',
      'Ein mächtiges Artefakt wurde geschmiedet, um {subject} zu ermöglichen.'
    ],
    fix: [
      'Die Verderbnis, die {subject} plagte, wurde durch die Riten von {author} gebannt.',
      'Ein Riss im Gefüge von {scope} wurde erfolgreich versiegelt.',
      'Die Schatten über {subject} sind gewichen.'
    ],
    refactor: [
      'Die uralten Pfade der Macht wurden von {author} neu gewebt, um die Harmonie zu stärken.',
      'Die Architektur der Realität in {scope} wurde für die Ewigkeit restrukturiert.',
      'Veraltete Siegel wurden durch effizientere Glyphen ersetzt.'
    ],
    chore: [
      'Die Wächter von Areloria bereiteten die Fundamente für kommende Zeitalter vor.',
      'Rituelle Reinigungen in {scope} sorgen für anhaltende Stabilität.',
      'Die Bibliotheken wurden von unnötigem Ballast befreit.'
    ],
    docs: [
      'Die Chroniken wurden um das Wissen über {subject} erweitert.',
      'Verlorene Glyphen wurden in den Archiven von {scope} wiederentdeckt.',
      'Ein neues Kapitel der Weisheit wurde von {author} niedergeschrieben.'
    ],
    perf: [
      'Der Fluss des Äthers wurde beschleunigt, um die Macht von {subject} zu entfesseln.',
      'Die Resonanzfrequenz von {scope} erreicht nun bisher ungekannte Höhen.',
      'Widerstände im Energienetz wurden durch meisterhafte Präzision minimiert.'
    ],
    style: [
      'Die ästhetische Aura von {subject} wurde verfeinert.',
      'Die visuellen Siegel in {scope} erstrahlen in neuem Glanz.',
      'Harmonische Schwingungen verbessern die Wahrnehmung von {subject}.'
    ],
    test: [
      'Die Prophezeiungen wurden auf ihre Beständigkeit geprüft.',
      'In den Übungsräumen von {scope} wurden die Grenzen der Realität getestet.',
      'Sicherheitsrunen wurden aktiviert, um die Zukunft zu sichern.'
    ]
  };

  /**
   * Generates Lore-Seeded Pseudo-Randomness (LSPR)
   * Converts a cryptographic hex string into a deterministic floating point [0, 1)
   */
  private lspr(seed: string): number {
    const hash = createHash('sha256').update(seed).digest('hex');
    const part = parseInt(hash.substring(0, 8), 16);
    return part / 0xffffffff;
  }

  /**
   * Fetches the current world-state hash from the last lore entry to maintain the seed chain.
   */
  private async getWorldStateHash(): Promise<string> {
    const latestLore = await this.prisma.lore.findFirst({
      orderBy: { recordedAt: 'desc' }
    });
    
    // Fallback to a genesis seed if no lore exists
    if (!latestLore || !latestLore.metadata) {
      return createHash('sha256').update('ARELORIA_GENESIS').digest('hex');
    }

    const metadata = latestLore.metadata as any;
    return metadata.seedChain || createHash('sha256').update(JSON.stringify(latestLore)).digest('hex');
  }

  /**
   * Creates a new seed in the chain based on the world state and the current technical input.
   */
  private generateNewSeedChain(worldHash: string, input: LoreInput): string {
    const entropy = `${worldHash}-${input.hash || 'volatile'}-${input.author}-${Date.now()}`;
    return createHash('sha256').update(entropy).digest('hex');
  }

  public async translateTechnicalToLore(input: LoreInput): Promise<LoreOutput> {
    const worldHash = await this.getWorldStateHash();
    const seedChain = this.generateNewSeedChain(worldHash, input);
    
    const templates = this.loreTemplates[input.type] || ['Ein unbenanntes Ereignis erschütterte Areloria.'];
    
    // Deterministic selection based on the seed chain
    const templateIndex = Math.floor(this.lspr(seedChain + '_template') * templates.length);
    const template = templates[templateIndex];
    
    let narrative = template;
    narrative = narrative.split('{subject}').join(input.subject);
    narrative = narrative.split('{scope}').join(input.scope || 'Areloria');
    narrative = narrative.split('{author}').join(input.author);

    if (input.body) {
      narrative += ` Es heißt in den Legenden: "${input.body}"`;
    }

    const impactBase = this.calculateImpact(input.type);
    // Add minor deterministic variance to impact based on seed
    const impactVariance = Math.floor(this.lspr(seedChain + '_impact') * 3) - 1; 

    return {
      id: `lore_${createHash('md5').update(seedChain).digest('hex').substring(0, 12)}`,
      title: this.generateSeededLoreTitle(input, seedChain),
      narrative: narrative,
      category: this.mapTypeToLoreCategory(input.type),
      recordedAt: new Date(),
      chronicler: input.author,
      metadata: {
        originHash: input.hash,
        impactLevel: Math.max(1, impactBase + impactVariance),
        seedChain: seedChain
      }
    };
  }

  private generateSeededLoreTitle(input: LoreInput, seed: string): string {
    const prefixes = ['Das Erwachen von', 'Die Läuterung von', 'Die Chronik über', 'Das Mysterium von', 'Das Vermächtnis von'];
    const prefixIndex = Math.floor(this.lspr(seed + '_title') * prefixes.length);
    const prefix = prefixes[prefixIndex];
    return `${prefix} ${input.scope || input.subject}`;
  }

  private mapTypeToLoreCategory(type: TechnicalImpact): string {
    const categories: Record<TechnicalImpact, string> = {
      feat: 'Manifestation',
      fix: 'Heilung',
      refactor: 'Harmonisierung',
      chore: 'Instandhaltung',
      docs: 'Gelehrsamkeit',
      perf: 'Alchemie',
      style: 'Ästhetik',
      test: 'Prophezeiung'
    };
    return categories[type] || 'Legende';
  }

  private calculateImpact(type: TechnicalImpact): number {
    const values: Record<TechnicalImpact, number> = {
      feat: 10,
      fix: 7,
      refactor: 5,
      perf: 8,
      chore: 2,
      docs: 3,
      style: 1,
      test: 4
    };
    return values[type] || 0;
  }
}