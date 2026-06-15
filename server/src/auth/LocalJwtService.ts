import jwt, { SignOptions, Secret, Algorithm } from 'jsonwebtoken';

export interface SysAdminPayload {
    userId: string;
    username: string;
    role: 'sys-admin';
}

export class LocalJwtService {
    private readonly secret: Secret;
    private readonly algorithm: Algorithm = 'HS256';
    private readonly expiresIn: string = '1h';

    constructor() {
        const envSecret = process.env.SYS_ADMIN_JWT_SECRET;
        if (!envSecret && process.env.NODE_ENV === 'production') {
            throw new Error('FATAL: SYS_ADMIN_JWT_SECRET is not set in production environment.');
        }
        this.secret = envSecret || 'default-local-sys-admin-secret-key-change-in-prod';
    }

    public generateToken(payload: SysAdminPayload): string {
        const signOptions: SignOptions = {
            algorithm: this.algorithm,
            expiresIn: this.expiresIn as any,
            issuer: 'local-auth-service'
        };

        const jwtPayload = {
            sub: payload.userId,
            name: payload.username,
            role: payload.role,
            iat: Math.floor(Date.now() / 1000)
        };

        return jwt.sign(jwtPayload, this.secret, signOptions);
    }

    public verifyToken(token: string): SysAdminPayload | null {
        try {
            const decoded = jwt.verify(token, this.secret, {
                algorithms: [this.algorithm],
                issuer: 'local-auth-service'
            }) as any;

            if (!decoded || typeof decoded === 'string') {
                return null;
            }

            return {
                userId: decoded.sub,
                username: decoded.name,
                role: decoded.role
            };
        } catch (error) {
            return null;
        }
    }

    public decodeWithoutVerification(token: string): any {
        return jwt.decode(token);
    }
}

export const localJwtService = new LocalJwtService();