import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  token: z.string().optional(),
  characterId: z.string().optional(),
});
