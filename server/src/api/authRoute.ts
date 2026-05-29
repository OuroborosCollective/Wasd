import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';

export function authRoute(): Router {
  const router = Router();
  router.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const secret = process.env.JWT_SECRET || 'game_development_secret_key_99';

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing credentials"
        });
      }

      if (username.trim().length < 3 || password.length < 4) {
        return res.status(401).json({
          success: false, 
          message: "Invalid username or password format"
        });
      }

      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        username: username.toLowerCase(),
        role: 'player',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      })).toString('base64url');

      const signature = crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      const token = `${header}.${payload}.${signature}`;

      return res.status(200).json({
        success: true,
        token: token,
        user: {
          username: username,
          loginTime: new Date().toISOString()
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error during authentication"
      });
    }
  });
  return router;
}
