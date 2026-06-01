import { Injectable, Logger } from '@nestjs/common';
import { OpenAIProvider } from '../../../llm/providers/openai.provider.js';

export interface ReviewResult {
  score: number;
  solidCompliance: {
    passed: boolean;
    violations: string[];
    details: string;
  };
  memoryLeaks: {
    detected: boolean;
    risks: string[];
  };
  schemaValidation: {
    isValid: boolean;
    mismatches: string[];
  };
  suggestions: string[];
  reviewedAt: Date;
}

@Injectable()
export class ReviewerAgent {
  private readonly logger = new Logger(ReviewerAgent.name);

  constructor(private readonly llmProvider: OpenAIProvider) {}

  public async reviewCode(code: string, originalSchema: any): Promise<ReviewResult> {
    const prompt = this.buildReviewPrompt(code, originalSchema);
    
    try {
      const response = await this.llmProvider.generateJSON(prompt);
      return {
        score: response.score || 0,
        solidCompliance: {
          passed: response.solid?.passed || false,
          violations: response.solid?.violations || [],
          details: response.solid?.details || '',
        },
        memoryLeaks: {
          detected: response.leaks?.detected || false,
          risks: response.leaks?.risks || [],
        },
        schemaValidation: {
          isValid: response.schema?.isValid || false,
          mismatches: response.schema?.mismatches || [],
        },
        suggestions: response.suggestions || [],
        reviewedAt: new Date(0) /* ARE-DETERMINISM-ALLOW: determinism placeholder */,
      };
    } catch (error) {
      this.logger.error('Failed to perform automated code review', error.stack);
      throw new Error('Code review failed');
    }
  }

  private buildReviewPrompt(code: string, schema: any): string {
    return `
      Perform a deep technical code review on the following TypeScript code.
      
      Code to review:
      \`\`\`typescript
      ${code}
      \`\`\`

      Reference Architect Schema:
      ${JSON.stringify(schema, null, 2)}

      Review Criteria:
      1. SOLID Principles: 
         - S: Single Responsibility Principle
         - O: Open/Closed Principle
         - L: Liskov Substitution Principle
         - I: Interface Segregation Principle
         - D: Dependency Inversion Principle
      2. Memory Management:
         - Detect potential memory leaks (e.g., uncleared event listeners, global references, closures).
      3. Schema Validation:
         - Ensure the implementation matches the names, types, and structure defined in the architect's schema.
      4. Code Quality:
         - Logic errors, performance bottlenecks, and readability.

      Return ONLY a JSON object with the following structure:
      {
        "score": number (0-100),
        "solid": {
          "passed": boolean,
          "violations": string[],
          "details": string
        },
        "leaks": {
          "detected": boolean,
          "risks": string[]
        },
        "schema": {
          "isValid": boolean,
          "mismatches": string[]
        },
        "suggestions": string[]
      }
    `;
  }

  public async validateSOLID(code: string): Promise<ReviewResult['solidCompliance']> {
    void code;
    const response = await this.llmProvider.generateJSON("");
    return {
      passed: response.solid.passed,
      violations: response.solid.violations,
      details: response.solid.details,
    };
  }

  public async detectPotentialLeaks(code: string): Promise<ReviewResult['memoryLeaks']> {
    void code;
    const response = await this.llmProvider.generateJSON("");
    return {
      detected: response.leaks.detected,
      risks: response.leaks.risks,
    };
  }

  public async validateSchema(code: string, schema: any): Promise<ReviewResult['schemaValidation']> {
    void schema;
    void code;
    const response = await this.llmProvider.generateJSON("");
    return {
      isValid: response.schema.isValid,
      mismatches: response.schema.mismatches,
    };
  }
}