// Living Duden Telemetry Types for ARE Shadow Side-Channel

export interface LivingDudenArchive {
  readonly totalLexemes: number;
  readonly inventedCount: number;
  readonly quarantinedCount: number;
  readonly promotedCount: number;
  readonly byLanguageCount: Readonly<Record<string, number>>;
}

export interface TermAlert {
  readonly term: string;
  readonly alertType: "term" | "honorific" | "watch";
  readonly severity: "low" | "medium" | "high";
}

export interface SpeechEvent {
  readonly eventHash: string;
  readonly tick: number;
  readonly npcId: string;
  readonly factionId: string;
  readonly role: string;
  readonly intent: string;
  readonly truthMode?: string;
  readonly speechHash: string;
  readonly constructedText: string;
  readonly sentenceStructure: string;
  readonly selectedLexemeIds: ReadonlyArray<string>;
  readonly selectedWords: ReadonlyArray<string>;
  readonly thoughtVector: Readonly<{
    readonly hunger: number;
    readonly trust: number;
    readonly fear: number;
    readonly duty: number;
    readonly pride: number;
    readonly revenge: number;
  }>;
  readonly reactionLane: string;
  readonly confidence: number;
  readonly needsFallback?: boolean;
  readonly termAlerts: ReadonlyArray<TermAlert>;
}

export interface WordFactorRanking {
  readonly id?: string;
  readonly lemma: string;
  readonly language: string;
  readonly partOfSpeech: string;
  readonly factor: number;
  readonly successRate: number;
  readonly totalUses: number;
  readonly npcUses: number;
  readonly failures?: number;
  readonly concepts?: ReadonlyArray<string>;
  readonly quarantined: boolean;
}

export interface TermWatchEntry {
  readonly factionId: string;
  readonly factionName?: string;
  readonly watchedTerms: ReadonlyArray<string>;
  readonly honorifics: ReadonlyArray<string>;
}

export interface StructureRanking {
  readonly structure: string;
  readonly count: number;
}

export interface LivingDudenTelemetry {
  readonly ok: boolean;
  readonly archive: LivingDudenArchive;
  readonly speech: ReadonlyArray<SpeechEvent>;
  readonly wordFactorRankings: ReadonlyArray<WordFactorRanking>;
  readonly termWatch: ReadonlyArray<TermWatchEntry>;
  readonly structureRankings: ReadonlyArray<StructureRanking>;
  readonly outcomeHistorySize: number;
}

export type ShadowStatus = "loading" | "live" | "empty" | "error";

export interface LivingDudenShadowWindowProps {
  readonly telemetry?: LivingDudenTelemetry | null;
  readonly status?: ShadowStatus;
  readonly errorMessage?: string | null;
  readonly endpoint?: string;
  readonly isLoading?: boolean;
}
