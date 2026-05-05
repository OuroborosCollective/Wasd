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
  };
}

export class LoreNarrativeEngine {
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

  public async translateTechnicalToLore(input: LoreInput): Promise<LoreOutput> {
    const templates = this.loreTemplates[input.type] || ['Ein unbenanntes Ereignis erschütterte Areloria.'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let narrative = template;
    
    // Vermeidung von replace(//g) durch Nutzung von split/join für globale Ersetzungen
    narrative = narrative.split('{subject}').join(input.subject);
    narrative = narrative.split('{scope}').join(input.scope || 'Areloria');
    narrative = narrative.split('{author}').join(input.author);

    if (input.body) {
      narrative += ` Es heißt in den Legenden: "${input.body}"`;
    }

    return {
      id: `lore_${Math.random().toString(36).substring(2, 9)}`,
      title: this.generateLoreTitle(input),
      narrative: narrative,
      category: this.mapTypeToLoreCategory(input.type),
      recordedAt: new Date(),
      chronicler: input.author,
      metadata: {
        originHash: input.hash,
        impactLevel: this.calculateImpact(input.type)
      }
    };
  }

  private generateLoreTitle(input: LoreInput): string {
    const prefixes = ['Das Erwachen von', 'Die Läuterung von', 'Die Chronik über', 'Das Mysterium von'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
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