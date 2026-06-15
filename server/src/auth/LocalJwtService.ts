import jwt, { type Algorithm, type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken';

export interface SysAdminPayload {
    userId: string;
    username: string;
    role: 'sys-admin';
}

const LOCAL_DEV_SYS_ADMIN_SECRET = 'default-local-sys-admin-secret-key-change-in-prod';

function resolveSysAdminJwtSecret(): Secret {
    const envSecret = process.env.SYS_ADMIN_JWT_SECRET?.trim();
    if (envSecret) return envSecret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: SYS_ADMIN_JWT_SECRET is not set in production environment.');
    }

    return LOCAL_DEV_SYS_ADMIN_SECRET;
}

function normalizeDecodedPayload(decoded: string | JwtPayload): SysAdminPayload | null {
    if (!decoded || typeof decoded === 'string') return null;
    if (decoded.role !== 'sys-admin') return null;
    if (typeof decoded.sub !== 'string' || decoded.sub.trim().length === 0) return null;
    if (typeof decoded.name !== 'string' || decoded.name.trim().length === 0) return null;

    return {
        userId: decoded.sub,
        username: decoded.name,
        role: decoded.role,
    };
}

export class LocalJwtService {
    private readonly secret: Secret;
    private readonly algorithm: Algorithm = 'HS256';
    private readonly expiresIn: string = '1h';

    constructor() {
        this.secret = resolveSysAdminJwtSecret();
    }

    public generateToken(payload: SysAdminPayload): string {
        const signOptions: SignOptions = {
            algorithm: this.algorithm,
            expiresIn: this.expiresIn as any,
            issuer: 'local-auth-service',
        };

        return jwt.sign(
            {
                sub: payload.userId,
                name: payload.username,
                role: payload.role,
            },
            this.secret,
            signOptions,
        );
    }

    public verifyToken(token: string): SysAdminPayload | null {
        try {
            const decoded = jwt.verify(token, this.secret, {
                algorithms: [this.algorithm],
                issuer: 'local-auth-service',
            }) as string | JwtPayload;

            return normalizeDecodedPayload(decoded);
        } catch {
            return null;
        }
    }

    public decodeWithoutVerification(token: string): string | JwtPayload | null {
        return jwt.decode(token);
    }
}

export const localJwtService = new LocalJwtService();
