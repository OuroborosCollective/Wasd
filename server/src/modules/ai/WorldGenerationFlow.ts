import { genkit, z } from 'genkit';
import { googleAI, gemini } from '@genkit-ai/googleai';

const ai = genkit({
  plugins: [googleAI({ apiKey: "AQ.Ab8RN6JcAbnGNQHj-20k8dSdK3p-wjvvOhDMNktjcub9KGdT7g" })],
});

export const generateWorldObjectsFlow = ai.defineFlow({
  name: 'generateWorldObjects',
  inputSchema: z.object({
    prompt: z.string(),
    baseX: z.number(),
    baseY: z.number(),
  }),
  outputSchema: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    scale: z.number().optional(),
    rotation: z.number().optional()
  })),
}, async (input) => {
  const { prompt, baseX, baseY } = input;

  const response = await ai.generate({
    model: gemini('gemini-2.5-flash'),
    prompt: `You are a world builder for a top-down RPG game.
The user wants to generate: "${prompt}"
Base coordinates: x=${baseX}, y=${baseY}.
Generate a list of static world objects (like houses, trees, wells, dungeons, rocks, fences) that form this structure.
Distribute them reasonably around the base coordinates. The game uses 1 unit = 1 meter.
Houses are about 4x4 meters, trees are 2x2 meters. Leave enough space (at least 5-10 units) between large objects like houses.
Types can be: "house", "tree", "well", "dungeon", "rock", "fence".
Return a JSON array of objects.`,
    output: {
      schema: z.array(z.object({
        id: z.string(),
        type: z.string(),
        name: z.string(),
        position: z.object({
          x: z.number(),
          y: z.number()
        }),
        scale: z.number().optional(),
        rotation: z.number().optional()
      }))
    }
  });

  return response.output || [];
});
