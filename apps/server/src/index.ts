import express from 'express';

export enum SupabaseAuthVerifyMode {
  JWT = 'JWT',
  SESSION = 'SESSION',
}

interface ServerConfig {
  verifyMode: SupabaseAuthVerifyMode;
  port: number;
}

const config: ServerConfig = {
  verifyMode: SupabaseAuthVerifyMode.JWT,
  port: Number(process.env.PORT) || 3000,
};

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  // Fix TS2367: Vergleiche gegen das Enum-Member statt gegen das String-Literal
  const isJwtMode = config.verifyMode === SupabaseAuthVerifyMode.JWT;

  res.json({
    status: 'ok',
    authMethod: isJwtMode ? 'Bearer Token' : 'Session Cookie',
    timestamp: new Date().toISOString(),
  });
});

app.listen(config.port, () => {
  console.log(`[server]: Server is running at http://localhost:${config.port}`);
});