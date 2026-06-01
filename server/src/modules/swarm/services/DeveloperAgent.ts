import { Logger } from "../../../core/logger/Logger.js";
import { AIService } from "../../../ai/services/AIService.js";

/**
 * Error tracking per specific error signature.
 * FAILURE COUNT INCREMENTS ONLY FOR IDENTICAL ERRORS.
 * NEW DIFFERENT ERRORS DO NOT TRIGGER GLOBAL COUNTER.
 */
interface ErrorSignature {
  errorKey: string;  // Hash of error message/stack
  count: number;
  firstSeen: number;
  lastSeen: number;
}

export interface ArchitectSpecification {
  featureName: string;
  requirements: string[];
  technicalStack: string[];
  constraints: string[];
  outputDirectory: string;
  context?: string;
}

export interface FileOutput {
  path: string;
  content: string;
  language: string;
}

export interface DeveloperResult {
  success: boolean;
  generatedFiles: FileOutput[];
  implementationNotes: string;
  timestamp: string;
  error?: string;
}

export class DeveloperAgent {
  private readonly aiService: AIService;
  
  // Per-error tracking: ONLY identical errors increment the counter
  private readonly errorRegistry: Map<string, ErrorSignature> = new Map();
  private readonly MAX_REPEATED_FAILURES = 5;
  private readonly FAILURE_WINDOW_MS = 300000; // 5 minutes

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * Track error - ONLY increments if EXACT same error repeats.
   * New different errors start fresh at count 1.
   */
  private trackError(errorMsg: string): boolean {
    const errorKey = this.hashError(errorMsg);
    const now = 0 /* ARE-DETERMINISM-ALLOW: determinism placeholder */;
    
    const existing = this.errorRegistry.get(errorKey);
    if (existing) {
      // Check if within failure window
      if (now - existing.firstSeen > this.FAILURE_WINDOW_MS) {
        // Expired - reset
        this.errorRegistry.set(errorKey, { errorKey, count: 1, firstSeen: now, lastSeen: now });
        return false;
      }
      existing.count++;
      existing.lastSeen = now;
      return existing.count >= this.MAX_REPEATED_FAILURES;
    }
    
    // New error - start fresh at 1
    this.errorRegistry.set(errorKey, { errorKey, count: 1, firstSeen: now, lastSeen: now });
    return false;
  }

  /**
   * Hash error for tracking - identical errors = identical hashes.
   */
  private hashError(errorMsg: string): string {
    // Simple hash for error fingerprinting
    let hash = 0;
    for (let i = 0; i < errorMsg.length; i++) {
      const char = errorMsg.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Check if we should abort due to repeated identical errors.
   */
  private shouldAbort(): boolean {
    for (const [, sig] of this.errorRegistry) {
      if (sig.count >= this.MAX_REPEATED_FAILURES) {
        return true;
      }
    }
    return false;
  }

  /**
   * Transforms architect specifications into production-ready code.
   * Ensures strict typing, error handling, and adherence to DRY/KISS principles.
   */
  public async executeImplementation(spec: ArchitectSpecification): Promise<DeveloperResult> {
    Logger.log(`[DeveloperAgent] Starting implementation for: ${spec.featureName}`);
    
    try {
      this.validateSpec(spec);

      const prompt = this.constructDeveloperPrompt(spec);
      const aiResponse = await this.aiService.generateResponse(prompt);

      const files = this.extractCodeBlocks(aiResponse);
      
      if (files.length === 0) {
        throw new Error("AI failed to generate extractable code blocks.");
      }

      return {
        success: true,
        generatedFiles: files,
        implementationNotes: "Feature implemented following architect guidelines.",
        timestamp: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Track the error - returns true if we should abort due to REPEATED identical errors
      const shouldAbort = this.trackError(errorMessage);
      
      if (shouldAbort) {
        const sig = [...this.errorRegistry.values()].find(s => s.count >= this.MAX_REPEATED_FAILURES);
        Logger.error(
          `[DeveloperAgent] Implementation failed AFTER ${sig?.count || 0} retries with same error: ${errorMessage}. Aborting agent loop.`,
        );
        return {
          success: false,
          generatedFiles: [],
          implementationNotes: `CRITICAL FAILURE: Same error repeated ${this.MAX_REPEATED_FAILURES} times. Agent loop stopped.`,
          timestamp: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
          error: `ABORT: ${errorMessage}`
        };
      }
      
      Logger.log(`[DeveloperAgent] Implementation attempt failed (error key tracked): ${errorMessage}`);
      return {
        success: false,
        generatedFiles: [],
        implementationNotes: "Failed during code generation phase.",
        timestamp: "1970-01-01T00:00:00.000Z" /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
        error: errorMessage
      };
    }
  }

  /**
   * Validates the input specification to prevent logical errors early.
   */
  private validateSpec(spec: ArchitectSpecification): void {
    if (!spec.featureName || spec.requirements.length === 0) {
      throw new Error("Invalid Architect Specification: featureName and requirements are mandatory.");
    }
    if (!spec.outputDirectory) {
      throw new Error("Output directory must be specified for code generation.");
    }
  }

  /**
   * Constructs a strictly typed prompt for the LLM.
   */
  private constructDeveloperPrompt(spec: ArchitectSpecification): string {
    return `
      ACT AS: Senior Fullstack Developer (TypeScript Expert).
      TASK: Implement the following feature based on the Architect's specification.
      
      FEATURE: ${spec.featureName}
      REQUIREMENTS:
      ${spec.requirements.map(req => `- ${req}`).join("\n")}
      
      TECHNICAL STACK: ${spec.technicalStack.join(", ")}
      CONSTRAINTS: ${spec.constraints.join(", ")}
      CONTEXT: ${spec.context || "No additional context provided."}
      
      CODING STANDARDS:
      1. Strict TypeScript usage (no 'any').
      2. Comprehensive Error Handling (Try-Catch blocks at boundaries).
      3. DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid).
      4. Standardized Export/Import patterns.
      
      OUTPUT FORMAT:
      Provide every file in the following format:
      FILEPATH: [path/to/file]
      \`\`\`[language]
      [code content]
      \`\`\`
    `;
  }

  /**
   * Parses the raw AI string into structured file objects.
   */
  private extractCodeBlocks(text: string): FileOutput[] {
    const files: FileOutput[] = [];
    const fileSplitter = /FILEPATH:\s*([^\n\s]+)/g;
    const codeBlockRegex = /(\w+)?\n([\s\S]*?)/g;

    let match;
    while ((match = fileSplitter.exec(text)) !== null) {
      const path = match[1];
      const nextText = text.substring(match.index + match[0].length);
      const codeMatch = codeBlockRegex.exec(nextText);

      if (codeMatch) {
        files.push({
          path,
          language: codeMatch[1] || "typescript",
          content: codeMatch[2].trim()
        });
      }
      // Reset lastIndex for the inner regex to ensure it finds the next block correctly
      codeBlockRegex.lastIndex = 0;
    }

    return files;
  }
}