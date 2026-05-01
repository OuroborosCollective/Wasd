import { Injectable, Logger } from '@nestjs/common';
import { OpenAiProvider } from '../../llm/providers/openai.provider';

@Injectable()
export class ReviewerAgent {
  private readonly logger = new Logger(ReviewerAgent.name);

  constructor(private readonly openai: OpenAiProvider) {}

  /**
   * Reviews the provided code using the LLM provider.
   * @param code The source code to review.
   * @returns The review result as a string.
   */
  async reviewCode(code: string): Promise<string> {
    try {
      const prompt = `Review the following code for potential bugs, security issues, and style improvements:\n\n${code}`;
      const response = await this.openai.generateCompletion(prompt);
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during code review: ${errorMessage}`);
      throw new Error(`ReviewerAgent failed: ${errorMessage}`);
    }
  }
}