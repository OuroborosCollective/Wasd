import * as jwt from 'jsonwebtoken';
import { SignOptions, Secret } from 'jsonwebtoken';

export class LocalJwtService {
  private readonly secret: string;
  private readonly defaultExpiresIn: string | number;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'fallback-secret-key-change-me';
    this.defaultExpiresIn = process.env.JWT_EXPIRES_IN || '1d';
  }

  sign(payload: string | Buffer | object, options: SignOptions = {}): string {
    const signOptions: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.defaultExpiresIn as any,
      ...options,
    } as SignOptions;

    return jwt.sign(payload, this.secret as Secret, signOptions);
  }

  verify<T extends object>(token: string): T {
    try {
      return jwt.verify(token, this.secret as Secret) as T;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  decode(token: string): any {
    return jwt.decode(token);
  }
}