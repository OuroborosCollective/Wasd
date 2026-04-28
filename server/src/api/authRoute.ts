import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export function authRoute() {
  return {
    method: "POST",
    path: "/api/auth/login",
    handler: async (req: Request, res: Response) => {
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

        const token = jwt.sign(
          { 
            username: username.toLowerCase(),
            role: 'player',
            iat: Math.floor(Date.now() / 1000)
          }, 
          secret, 
          { expiresIn: '24h' }
        );

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
    }
  };
}
