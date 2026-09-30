import crypto from 'crypto';
import { getDb } from './mongodb';

// JWT_SECRET must be set in .env for production security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set. Application cannot start securely.');
}
const SECRET = JWT_SECRET || 'laundry2u26-dev-fallback-secret-change-in-prod';

// ---------------------------------------------------------------------------
// Cryptographic Password Hashing (OWASP-Compliant PBKDF2 with Per-User Salt)
// ---------------------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const LEGACY_SALT = 'l2u26-fixed-salt-2026';

/**
 * Hashes a password using PBKDF2-HMAC-SHA512 with a cryptographically secure random per-user salt.
 * Output format: `$pbkdf2$<iterations>$<salt>$<hash>`
 */
export function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    return `$pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Checks whether a stored password hash uses the legacy static salt format.
 */
export function isLegacyHash(storedHash?: string | null): boolean {
    return !storedHash || !storedHash.startsWith('$pbkdf2$');
}

/**
 * Constant-time password verification supporting both the modern per-user salt format
 * and backwards-compatible legacy fixed-salt hashes.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
    if (!password || !storedHash) return false;

    try {
        if (storedHash.startsWith('$pbkdf2$')) {
            const parts = storedHash.split('$');
            // Expected format: ['', 'pbkdf2', '100000', '<salt>', '<hash>']
            if (parts.length !== 5) return false;
            const iterations = parseInt(parts[2], 10);
            const salt = parts[3];
            const expectedHash = parts[4];

            const computedHash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
            const expectedBuf = Buffer.from(expectedHash, 'hex');
            const computedBuf = Buffer.from(computedHash, 'hex');

            if (expectedBuf.length !== computedBuf.length) return false;
            return crypto.timingSafeEqual(expectedBuf, computedBuf);
        }

        // Backward compatibility: legacy fixed-salt verification
        const legacyHash = crypto.pbkdf2Sync(password, LEGACY_SALT, 10000, 64, 'sha512').toString('hex');
        const expectedBuf = Buffer.from(storedHash, 'hex');
        const computedBuf = Buffer.from(legacyHash, 'hex');

        if (expectedBuf.length !== computedBuf.length) return false;
        return crypto.timingSafeEqual(expectedBuf, computedBuf);
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Base64Url Helpers
// ---------------------------------------------------------------------------
function base64UrlEncode(input: string | Buffer): string {
    const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
    return buf.toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JwtPayload {
    sub: string;
    email?: string;
    role?: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}

// ---------------------------------------------------------------------------
// JWT Signing
// ---------------------------------------------------------------------------

/**
 * Signs a payload as a compact HS256 JWT.
 * @param payload    - Claims to include. `sub` (subject/user ID) is required.
 * @param expiryDays - Number of days until the token expires (default: 7)
 */
export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiryDays = 7): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiryDays * 24 * 60 * 60;

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, iat, exp }));

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(signingInput)
        .digest('base64url');

    return `${signingInput}.${signature}`;
}

/**
 * Signs an Admin payload with shorter expiry (default 8 hours) for heightened security.
 */
export function signAdminJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiryHours = 8): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + expiryHours * 60 * 60;

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, iat, exp }));

    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', SECRET)
        .update(signingInput)
        .digest('base64url');

    return `${signingInput}.${signature}`;
}

// ---------------------------------------------------------------------------
// Multi-Instance & Serverless Distributed Token Revocation
// ---------------------------------------------------------------------------

// In-memory cache for ultra-fast checks, kept synchronized with MongoDB revoked_tokens collection
const REVOKED_TOKENS_CACHE = new Set<string>();
let lastRevokedSyncTime = 0;
const CACHE_TTL_MS = 15000; // Synchronize from MongoDB at most once every 15 seconds per worker

/**
 * Synchronizes the local memory cache with MongoDB's revoked_tokens collection.
 */
export async function syncRevokedTokens(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - lastRevokedSyncTime < CACHE_TTL_MS) {
        return;
    }

    try {
        lastRevokedSyncTime = now;
        const db = await getDb();
        const activeRevoked = await db.collection('revoked_tokens')
            .find({ expiresAt: { $gt: new Date() } }, { projection: { token: 1 } })
            .toArray();

        for (const item of activeRevoked) {
            if (item.token) REVOKED_TOKENS_CACHE.add(item.token);
        }
    } catch {
        // Retain in-memory cache if MongoDB is temporarily unreachable
    }
}

/**
 * Revokes a token by immediately updating the local memory cache and persisting to MongoDB
 * with TTL expiration so all serverless instances and worker replicas synchronize revocation.
 */
export async function revokeToken(token: string, userId?: string, expiryDate?: Date): Promise<void> {
    if (!token) return;
    REVOKED_TOKENS_CACHE.add(token);

    try {
        const db = await getDb();
        const expiresAt = expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.collection('revoked_tokens').updateOne(
            { token },
            {
                $setOnInsert: {
                    token,
                    userId: userId || 'unknown',
                    revokedAt: new Date().toISOString(),
                    expiresAt,
                },
            },
            { upsert: true }
        );
    } catch (err) {
        console.error('[Token Revocation] Error persisting revoked token to MongoDB:', err);
    }
}

/**
 * Synchronously checks whether a token has been revoked.
 * Automatically triggers background cache synchronization if the cache is stale.
 */
export function isTokenRevoked(token: string): boolean {
    if (!token) return true;
    if (REVOKED_TOKENS_CACHE.has(token)) return true;

    // Trigger non-blocking cache synchronization if stale
    if (Date.now() - lastRevokedSyncTime >= CACHE_TTL_MS) {
        syncRevokedTokens().catch(() => {});
    }

    return false;
}

/**
 * Asynchronously checks whether a token is revoked by verifying against the cache
 * and directly checking MongoDB if not cached. Recommended for critical endpoints.
 */
export async function isTokenRevokedAsync(token: string): Promise<boolean> {
    if (!token) return true;
    if (REVOKED_TOKENS_CACHE.has(token)) return true;

    try {
        const db = await getDb();
        const record = await db.collection('revoked_tokens').findOne({
            token,
            expiresAt: { $gt: new Date() },
        });

        if (record) {
            REVOKED_TOKENS_CACHE.add(token);
            return true;
        }
    } catch {
        // Fall back to memory cache
    }

    return false;
}

// ---------------------------------------------------------------------------
// JWT Verification
// ---------------------------------------------------------------------------

/**
 * Verifies a JWT and returns the decoded payload, or null if invalid, expired, or revoked.
 */
export function verifyJwt(token: string): JwtPayload | null {
    try {
        if (isTokenRevoked(token)) {
            return null; // Revoked token
        }

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [encodedHeader, encodedPayload, signature] = parts;
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        const expectedSig = crypto
            .createHmac('sha256', SECRET)
            .update(signingInput)
            .digest('base64url');

        // Constant-time comparison to prevent timing attacks
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSig);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
            return null;
        }

        const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));

        // Check expiry
        if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
            return null; // Expired
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Asynchronously verifies a JWT with authoritative MongoDB token revocation checking.
 */
export async function verifyJwtAsync(token: string): Promise<JwtPayload | null> {
    try {
        if (await isTokenRevokedAsync(token)) {
            return null;
        }
        return verifyJwt(token);
    } catch {
        return null;
    }
}
