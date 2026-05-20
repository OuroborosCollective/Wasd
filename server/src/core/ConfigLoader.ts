// @ARE-GUARD-EXEMPT: core meta
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url({ message: "SUPABASE_URL ist erforderlich und muss eine valide URL sein." }),
  SUPABASE_ANON_KEY: z.string().min(1, { message: "SUPABASE_ANON_KEY ist erforderlich." }),
  DATABASE_URL: z.string().optional(),
});

const validateConfig = () => {
  try {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
      console.error('❌ Kritischer Konfigurationsfehler: Umgebungsvariablen sind ungültig.');
      console.error(JSON.stringify(parsed.error.format(), null, 2));
      process.exit(1);
    }

    return parsed.data;
  } catch (error) {
    console.error('❌ Unerwarteter Fehler beim Laden der Konfiguration:', error);
    process.exit(1);
  }
};

export const config = validateConfig();

export type Config = z.infer<typeof envSchema>;