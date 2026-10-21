import crypto from 'crypto';
import { Auth0Role, AUTH0_ROLES, normalizeRole } from '@laundelle/auth';
import { BadRequestError, ApiError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';

export interface Auth0UserRecord {
    id: string; // Auth0 user ID (e.g. auth0|...)
    email: string;
    name?: string;
    emailVerified?: boolean;
    blocked?: boolean;
    appMetadata?: Record<string, any>;
    userMetadata?: Record<string, any>;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateAuth0UserParams {
    email: string;
    username?: string;
    name: string;
    role: Auth0Role;
    phone?: string;
    emailVerified?: boolean;
    appMetadata?: Record<string, any>;
    userMetadata?: Record<string, any>;
}

export interface UpdateAuth0UserParams {
    name?: string;
    email?: string;
    phone?: string;
    blocked?: boolean;
    emailVerified?: boolean;
    appMetadata?: Record<string, any>;
    userMetadata?: Record<string, any>;
}

export interface PasswordChangeTicketResult {
    ticketUrl: string;
}

export interface ProvisionStaffUserParams extends CreateAuth0UserParams {
    actorId?: string;
    actorRole?: string;
    clientIp?: string;
    resultUrl?: string;
}

export interface ProvisionStaffResult {
    auth0UserId: string;
    auth0User: Auth0UserRecord;
    ticketUrl?: string;
    mongoUser?: any;
}

// ---------------------------------------------------------------------------
// Mock Transport for Unit / Automated Tests
// ---------------------------------------------------------------------------
export type MockTransportHandler = (
    endpoint: string,
    options: { method: string; headers: Record<string, string>; body?: string }
) => Promise<{ status: number; data: any }>;

let mockTransport: MockTransportHandler | null = null;

// ---------------------------------------------------------------------------
// In-Memory Token & Role ID Caching
// ---------------------------------------------------------------------------
let cachedM2MToken: string | null = null;
let m2mTokenExpiresAt = 0;
let tokenFetchPromise: Promise<string> | null = null;
const SAFETY_BUFFER_MS = 60 * 1000; // Refresh 60 seconds before expiration

const ROLE_ID_CACHE = new Map<string, { id: string; cachedAt: number }>();
const ROLE_ID_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache for role IDs

export class Auth0Service {
    /**
     * Injects a mock HTTP transport for test isolation.
     */
    public static setMockTransport(handler: MockTransportHandler | null) {
        mockTransport = handler;
        this.clearTokenCache();
        ROLE_ID_CACHE.clear();
    }

    /**
     * Clears cached M2M tokens (e.g. on 401 or test reset).
     */
    public static clearTokenCache() {
        cachedM2MToken = null;
        m2mTokenExpiresAt = 0;
        tokenFetchPromise = null;
    }

    private static getDomain(): string {
        const raw = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
        return raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    private static getM2MClientId(): string {
        return (process.env.AUTH0_M2M_CLIENT_ID || process.env.AUTH0_CLIENT_ID || '').trim();
    }

    private static getM2MClientSecret(): string {
        return (process.env.AUTH0_M2M_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET || '').trim();
    }

    private static getManagementAudience(): string {
        const domain = this.getDomain();
        return (process.env.AUTH0_MANAGEMENT_AUDIENCE || `https://${domain}/api/v2/`).trim();
    }

    private static getDbConnection(): string {
        return (process.env.AUTH0_DB_CONNECTION || 'Username-Password-Authentication').trim();
    }

    /**
     * Checks if Auth0 Management API credentials are configured in the environment.
     */
    public static isConfigured(): boolean {
        return Boolean(this.getM2MClientId() && this.getM2MClientSecret());
    }

    /**
     * Executes an authenticated Management API HTTP request with transient retry logic.
     */
    private static async request<T = any>(
        endpoint: string,
        method: string = 'GET',
        body?: any,
        retryCount = 0
    ): Promise<T> {
        const domain = this.getDomain();
        const url = `https://${domain}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        const token = await this.getManagementToken();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        if (mockTransport) {
            const mockRes = await mockTransport(endpoint, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            });

            if (mockRes.status >= 200 && mockRes.status < 300) {
                return mockRes.data as T;
            }

            if (mockRes.status === 401) {
                this.clearTokenCache();
            }

            const errorMsg = mockRes.data?.message || mockRes.data?.description || `Auth0 API error (${mockRes.status})`;
            throw new ApiError(errorMsg, 'AUTH0_API_ERROR', mockRes.status, mockRes.data);
        }

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                cache: 'no-store'
            });

            // Handle rate limit (HTTP 429) or transient 5xx with exponential backoff (up to 2 retries)
            if ((res.status === 429 || res.status >= 500) && retryCount < 2) {
                const retryAfterHeader = res.headers.get('Retry-After');
                const delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : (retryCount + 1) * 750;
                await new Promise(r => setTimeout(r, delayMs));
                return this.request<T>(endpoint, method, body, retryCount + 1);
            }

            // Invalidate token cache on 401 Unauthorized
            if (res.status === 401) {
                this.clearTokenCache();
            }

            if (res.status === 204) {
                return {} as T;
            }

            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                const errorMsg = json?.message || json?.description || json?.error || `Auth0 API Error (HTTP ${res.status})`;
                throw new ApiError(errorMsg, 'AUTH0_API_ERROR', res.status, json);
            }

            return json as T;
        } catch (err: any) {
            if (err instanceof ApiError) throw err;
            throw new ApiError(`Auth0 Management API request failed: ${err.message}`, 'AUTH0_NETWORK_ERROR', 502);
        }
    }

    /**
     * Acquires and caches an Auth0 Management API OAuth2 token using client credentials grant.
     */
    public static async getManagementToken(): Promise<string> {
        const now = Date.now();

        // 1. Return valid cached token if within safety buffer
        if (cachedM2MToken && now < (m2mTokenExpiresAt - SAFETY_BUFFER_MS)) {
            return cachedM2MToken;
        }

        // 2. Prevent concurrent token fetch stampedes
        if (tokenFetchPromise) {
            return tokenFetchPromise;
        }

        tokenFetchPromise = (async () => {
            const clientId = this.getM2MClientId();
            const clientSecret = this.getM2MClientSecret();
            const domain = this.getDomain();
            const audience = this.getManagementAudience();

            if (mockTransport) {
                const mockRes = await mockTransport('/oauth/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ grant_type: 'client_credentials' })
                });
                cachedM2MToken = mockRes.data.access_token || 'mock_m2m_token';
                m2mTokenExpiresAt = Date.now() + ((mockRes.data.expires_in || 86400) * 1000);
                tokenFetchPromise = null;
                return cachedM2MToken;
            }

            if (!clientId || !clientSecret) {
                throw new ApiError(
                    'Auth0 M2M credentials (AUTH0_M2M_CLIENT_ID / AUTH0_M2M_CLIENT_SECRET) are not configured on the backend.',
                    'AUTH0_CONFIG_MISSING',
                    500
                );
            }

            const tokenUrl = `https://${domain}/oauth/token`;
            try {
                const res = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: clientId,
                        client_secret: clientSecret,
                        audience: audience,
                        grant_type: 'client_credentials'
                    }),
                    cache: 'no-store'
                });

                const data = await res.json();
                if (!res.ok || !data.access_token) {
                    const msg = data.error_description || data.error || 'Failed to acquire Auth0 Management token';
                    throw new ApiError(msg, 'AUTH0_M2M_AUTH_FAILED', res.status || 500);
                }

                cachedM2MToken = data.access_token;
                const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 86400;
                m2mTokenExpiresAt = Date.now() + (expiresInSec * 1000);
                return cachedM2MToken;
            } finally {
                tokenFetchPromise = null;
            }
        })();

        return tokenFetchPromise;
    }

    /**
     * Resolves the Auth0 role ID for a given canonical role name.
     * Enforces a server-side allowlist: super_admin, plant_manager, driver, processor, customer.
     */
    public static async resolveRoleId(roleName: Auth0Role): Promise<string> {
        const canonical = normalizeRole(roleName);
        if (!canonical || !AUTH0_ROLES.includes(canonical)) {
            throw new BadRequestError(`Invalid or unrecognized role: "${roleName}". Allowed roles: ${AUTH0_ROLES.join(', ')}`);
        }

        const now = Date.now();
        const cached = ROLE_ID_CACHE.get(canonical);
        if (cached && now - cached.cachedAt < ROLE_ID_CACHE_TTL_MS) {
            return cached.id;
        }

        const roles = await this.request<any[]>('/api/v2/roles', 'GET');
        if (!Array.isArray(roles)) {
            throw new ApiError('Failed to retrieve role list from Auth0 tenant.', 'AUTH0_ROLES_LOOKUP_FAILED', 502);
        }

        // Cache all retrieved roles for efficiency
        for (const r of roles) {
            const normName = normalizeRole(r.name);
            if (normName) {
                ROLE_ID_CACHE.set(normName, { id: r.id, cachedAt: now });
            }
        }

        const match = ROLE_ID_CACHE.get(canonical);
        if (!match) {
            throw new ApiError(
                `Required Auth0 role "${canonical}" does not exist in your Auth0 tenant. Please create role "${canonical}" in your Auth0 Dashboard.`,
                'AUTH0_ROLE_NOT_FOUND',
                404
            );
        }

        return match.id;
    }

    /**
     * Creates an Auth0 user via Database Connection.
     * Generates a temporary high-entropy password (never stored in Laundelle DB or logged).
     */
    public static async createUser(params: CreateAuth0UserParams): Promise<Auth0UserRecord> {
        const canonicalRole = normalizeRole(params.role);
        if (!canonicalRole) {
            throw new BadRequestError(`Invalid role "${params.role}".`);
        }

        const formattedEmail = params.email.toLowerCase().trim();
        let username = params.username?.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 15);
        if (!username) {
            const prefix = (formattedEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') || 'usr').toLowerCase().substring(0, 6);
            username = `${prefix}${crypto.randomBytes(4).toString('hex')}`.substring(0, 15);
        }
        // Ephemeral random password strictly for Auth0 connection creation requirement.
        // User will set their permanent password via invitation ticket.
        const ephemeralPassword = `${crypto.randomBytes(24).toString('base64url')}!Aa9`;

        const payload: Record<string, any> = {
            connection: this.getDbConnection(),
            email: formattedEmail,
            username,
            name: params.name.trim(),
            password: ephemeralPassword,
            email_verified: params.emailVerified ?? false,
            verify_email: false,
            app_metadata: {
                role: canonicalRole,
                ...(params.appMetadata || {})
            },
            user_metadata: {
                ...(params.phone ? { phone: params.phone } : {}),
                ...(params.userMetadata || {})
            }
        };

        const res = await this.request<any>('/api/v2/users', 'POST', payload);

        return {
            id: res.user_id,
            email: res.email,
            name: res.name,
            emailVerified: res.email_verified,
            blocked: res.blocked,
            appMetadata: res.app_metadata,
            userMetadata: res.user_metadata,
            createdAt: res.created_at,
            updatedAt: res.updated_at
        };
    }

    /**
     * Assigns an Auth0 role to a user.
     */
    public static async assignRole(auth0UserId: string, roleName: Auth0Role): Promise<void> {
        const roleId = await this.resolveRoleId(roleName);
        await this.request(
            `/api/v2/users/${encodeURIComponent(auth0UserId)}/roles`,
            'POST',
            { roles: [roleId] }
        );
    }

    /**
     * Removes an Auth0 role from a user.
     */
    public static async removeRole(auth0UserId: string, roleName: Auth0Role): Promise<void> {
        const roleId = await this.resolveRoleId(roleName);
        await this.request(
            `/api/v2/users/${encodeURIComponent(auth0UserId)}/roles`,
            'DELETE',
            { roles: [roleId] }
        );
    }

    /**
     * Retrieves all assigned Auth0 roles for a user.
     */
    public static async getUserRoles(auth0UserId: string): Promise<string[]> {
        try {
            const res = await this.request<any[]>(
                `/api/v2/users/${encodeURIComponent(auth0UserId)}/roles`,
                'GET'
            );
            if (Array.isArray(res)) {
                return res.map(r => r.name).filter(Boolean);
            }
            return [];
        } catch (err: any) {
            console.warn(`[Auth0Service] Failed to retrieve roles for Auth0 user ${auth0UserId}:`, err?.message || err);
            return [];
        }
    }

    /**
     * Retrieves an Auth0 user by user ID.
     */
    public static async getUser(auth0UserId: string): Promise<Auth0UserRecord | null> {
        try {
            const res = await this.request<any>(`/api/v2/users/${encodeURIComponent(auth0UserId)}`, 'GET');
            return {
                id: res.user_id,
                email: res.email,
                name: res.name,
                emailVerified: res.email_verified,
                blocked: res.blocked,
                appMetadata: res.app_metadata,
                userMetadata: res.user_metadata,
                createdAt: res.created_at,
                updatedAt: res.updated_at
            };
        } catch (err: any) {
            if (err?.status === 404) return null;
            throw err;
        }
    }

    /**
     * Retrieves an Auth0 user by email.
     */
    public static async getUserByEmail(email: string): Promise<Auth0UserRecord | null> {
        const formatted = email.toLowerCase().trim();
        try {
            const res = await this.request<any[]>(`/api/v2/users-by-email?email=${encodeURIComponent(formatted)}`, 'GET');
            if (!Array.isArray(res) || res.length === 0) return null;
            const primary = res[0];
            return {
                id: primary.user_id,
                email: primary.email,
                name: primary.name,
                emailVerified: primary.email_verified,
                blocked: primary.blocked,
                appMetadata: primary.app_metadata,
                userMetadata: primary.user_metadata,
                createdAt: primary.created_at,
                updatedAt: primary.updated_at
            };
        } catch (err: any) {
            if (err?.status === 404) return null;
            throw err;
        }
    }

    /**
     * Updates an Auth0 user profile or metadata.
     */
    public static async updateUser(auth0UserId: string, updates: UpdateAuth0UserParams): Promise<Auth0UserRecord> {
        const payload: Record<string, any> = {};
        if (updates.name !== undefined) payload.name = updates.name;
        if (updates.email !== undefined) payload.email = updates.email.toLowerCase().trim();
        if (updates.blocked !== undefined) payload.blocked = updates.blocked;
        if (updates.emailVerified !== undefined) payload.email_verified = updates.emailVerified;
        if (updates.appMetadata !== undefined) payload.app_metadata = updates.appMetadata;
        if (updates.userMetadata !== undefined) payload.user_metadata = updates.userMetadata;

        const res = await this.request<any>(`/api/v2/users/${encodeURIComponent(auth0UserId)}`, 'PATCH', payload);
        return {
            id: res.user_id,
            email: res.email,
            name: res.name,
            emailVerified: res.email_verified,
            blocked: res.blocked,
            appMetadata: res.app_metadata,
            userMetadata: res.user_metadata,
            createdAt: res.created_at,
            updatedAt: res.updated_at
        };
    }

    /**
     * Blocks an Auth0 user account (disables login immediately).
     */
    public static async blockUser(auth0UserId: string): Promise<void> {
        await this.updateUser(auth0UserId, { blocked: true });
    }

    /**
     * Unblocks an Auth0 user account.
     */
    public static async unblockUser(auth0UserId: string): Promise<void> {
        await this.updateUser(auth0UserId, { blocked: false });
    }

    /**
     * Generates a password change / setup ticket for a newly provisioned user.
     * The ticket URL is returned to be delivered to the user (never logged).
     */
    public static async createPasswordChangeTicket(
        auth0UserId: string,
        resultUrl?: string
    ): Promise<PasswordChangeTicketResult> {
        const appUrl = resultUrl || process.env.APP_URL || 'https://laundelle.co.uk';
        const payload = {
            user_id: auth0UserId,
            result_url: appUrl,
            ttl_sec: 432000, // 5 days expiration
            mark_email_as_verified: true
        };

        const res = await this.request<any>('/api/v2/tickets/password-change', 'POST', payload);
        if (!res?.ticket) {
            throw new ApiError('Failed to generate Auth0 invitation ticket.', 'AUTH0_TICKET_FAILED', 502);
        }

        return { ticketUrl: res.ticket };
    }

    /**
     * Deletes an Auth0 user. Primary use is compensation rollback on failed provisioning.
     */
    public static async deleteUser(auth0UserId: string): Promise<void> {
        await this.request(`/api/v2/users/${encodeURIComponent(auth0UserId)}`, 'DELETE');
    }

    /**
     * Compensation Rollback: Safely cleans up or disables an Auth0 user if subsequent steps fail.
     * Prefers deletion; falls back to blocking if deletion fails.
     */
    public static async rollbackUserCreation(auth0UserId: string, reason: string): Promise<void> {
        try {
            await this.deleteUser(auth0UserId);
        } catch (delErr: any) {
            console.error(`[Auth0 Rollback] Deletion failed for ${auth0UserId}, attempting blocking:`, delErr.message);
            try {
                await this.blockUser(auth0UserId);
            } catch (blockErr: any) {
                console.error(`[Auth0 Rollback] Block failed for ${auth0UserId}:`, blockErr.message);
            }
        }

        // Record compensation in audit trail
        await AuditService.recordEvent({
            actorId: 'system',
            actorRole: 'system',
            action: 'auth0_user_provisioning_rollback',
            entityType: 'auth0_user',
            entityId: auth0UserId,
            reason
        }).catch(() => {});
    }

    /**
     * Safe Provisioning Transaction Workflow:
     * 1. Pre-validates user existence.
     * 2. Creates Auth0 user.
     * 3. Assigns canonical Auth0 role.
     * 4. Generates password change ticket.
     * 5. Calls provided MongoDB creator callback.
     * 6. Automatically rolls back Auth0 user if MongoDB creation throws!
     */
    public static async provisionStaffUserWithRollback(
        params: ProvisionStaffUserParams,
        mongoCreator: (auth0User: Auth0UserRecord) => Promise<any>
    ): Promise<ProvisionStaffResult> {
        const formattedEmail = params.email.toLowerCase().trim();

        // 1. Idempotency pre-check
        const existingAuth0 = await this.getUserByEmail(formattedEmail);
        if (existingAuth0) {
            throw new BadRequestError(`An Auth0 account with email "${formattedEmail}" already exists.`, {
                existingAuth0UserId: existingAuth0.id
            });
        }

        // 2. Create Auth0 user
        const auth0User = await this.createUser({
            email: formattedEmail,
            name: params.name,
            role: params.role,
            phone: params.phone,
            appMetadata: params.appMetadata,
            userMetadata: params.userMetadata
        });

        let ticketUrl: string | undefined;

        try {
            // 3. Assign Auth0 role
            await this.assignRole(auth0User.id, params.role);

            // 4. Generate password change ticket
            const ticketResult = await this.createPasswordChangeTicket(auth0User.id, params.resultUrl);
            ticketUrl = ticketResult.ticketUrl;

            // 5. Execute MongoDB profile creation
            const mongoUser = await mongoCreator(auth0User);

            // Audit record for successful provisioning
            await AuditService.recordEvent({
                actorId: params.actorId || 'system',
                actorRole: params.actorRole || 'system',
                action: 'staff_user_provisioned',
                entityType: 'user',
                entityId: String(mongoUser?._id || mongoUser?.id || auth0User.id),
                ipAddress: params.clientIp,
                metadata: {
                    auth0UserId: auth0User.id,
                    role: params.role,
                    email: formattedEmail
                }
            }).catch(() => {});

            return {
                auth0UserId: auth0User.id,
                auth0User,
                ticketUrl,
                mongoUser
            };
        } catch (flowError: any) {
            // Partial failure compensation rollback
            console.error(`[Auth0 Provisioning] Flow failed for ${auth0User.id}, executing rollback:`, flowError.message);
            await this.rollbackUserCreation(auth0User.id, `Flow failure: ${flowError.message}`);
            throw flowError;
        }
    }
}
