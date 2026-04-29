import { Logger } from "../../../core/logger/Logger";
import { AIService } from "../../ai/services/AIService";

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
  private readonly logger: Logger;
  private readonly aiService: AIService;

  constructor(aiService: AIService) {
    this.logger = new Logger("DeveloperAgent");
    this.aiService = aiService;
  }

  /**
   * Transforms architect specifications into production-ready code.
   * Ensures strict typing, error handling, and adherence to DRY/KISS principles.
   */
  public async executeImplementation(spec: ArchitectSpecification): Promise<DeveloperResult> {
    this.logger.info(`Starting implementation for: ${spec.featureName}`);
    
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
        timestamp: new Date().toISOString()
      };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Implementation failed: ${errorMessage}`);
      
      return {
        success: false,
        generatedFiles: [],
        implementationNotes: "Failed during code generation phase.",
        timestamp: new Date().toISOString(),
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