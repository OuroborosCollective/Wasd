import jwt from 'jsonwebtoken';

export interface SysAdminPayload {
    userId: string;
    username: string;
    role: 'sys-admin';
}

export class LocalJwtService {
    private readonly secret: string;
    private readonly algorithm: jwt.Algorithm = 'HS256';
    private readonly expiresIn: string = '1h';

    constructor() {
        this.secret = process.env.SYS_ADMIN_JWT_SECRET || 'default-local-sys-admin-secret-key-change-in-prod';
    }

    public generateToken(payload: SysAdminPayload): string {
        return (jwt.sign as any)(
            {
                sub: payload.userId,
                name: payload.username,
                role: payload.role,
                iat: Math.floor(Date.now() / 1000)
            },
            this.secret,
            {
                algorithm: this.algorithm,
                expiresIn: this.expiresIn,
                issuer: 'local-auth-service'
            }
        );
    }

    public verifyToken(token: string): SysAdminPayload | null {
        try {
            const decoded = jwt.verify(token, this.secret, {
                algorithms: [this.algorithm],
                issuer: 'local-auth-service'
            }) as any;

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