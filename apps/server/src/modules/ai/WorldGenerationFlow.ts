import { genkit, z } from 'genkit';
import { googleAI, gemini15Flash } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI()],
  model: gemini15Flash,
});

export const WorldGenerationInputSchema = z.object({
  theme: z.string(),
  complexity: z.number().optional(),
  description: z.string().optional(),
});

export type WorldGenerationInput = z.infer<typeof WorldGenerationInputSchema>;

export const WorldGenerationFlow = ai.defineFlow(
  {
    name: 'worldGenerationFlow',
    inputSchema: WorldGenerationInputSchema,
    outputSchema: z.string(),
  },
  async (input: WorldGenerationInput) => {
    const response = await ai.generate({
      prompt: `Generate a detailed world description based on the theme: ${input.theme}. 
               Complexity level: ${input.complexity ?? 'standard'}. 
               Additional context: ${input.description ?? 'none'}.`,
    });

    return response.text;
  }
);