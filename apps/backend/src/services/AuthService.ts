import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { hashPassword, signJwt, verifyPassword, isLegacyHash, revokeToken } from '@/lib/auth';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import crypto from 'crypto';

import { generateCustomerId } from '@laundelle/ids';

export class AuthService {
    
    static async signUp(body: any, clientIp: string = 'unknown') {
        const { email, password, fullName, phone } = body;
        
        if (!email || !password || !fullName) {
            throw new BadRequestError('Email, password and username/full name are required.');
        }
        if (!phone || String(phone).trim().length < 7) {
            throw new BadRequestError('A valid mobile number is required.');
        }
        if (password.length < 8) {
            throw new BadRequestError('Password must be at least 8 characters.');
        }

        const db = await getDb();
        const formatted = email.toLowerCase().trim();
        const existing = await db.collection('users').findOne({ email: formatted });
        
        if (existing) {
            throw new BadRequestError('An account with this email already exists.', { status: 409 });
        }

        const internalDbId = new ObjectId().toHexString();
        const customerId = generateCustomerId();
        const now = new Date().toISOString();

        const newUser = {
            _id: internalDbId as any,
            publicId: customerId,
            customerId: customerId,
            id: customerId,
            email: formatted,
            password: hashPassword(password),
            full_name: fullName.trim(),
            phone: String(phone).trim(),
            role: 'customer',
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=03045E&color=CAF0F8&size=128`,
            wallet_balance: 0,
            reward_points: 0,
            customer_status: 'new',
            addresses: [],
            preferences: {
                detergent: 'Standard',
                softener: 'Standard',
                fragrance: 'Fresh Linen',
                foldingPreference: 'Standard Flat Fold',
                starchedShirts: 'No Starch',
                smsNotifications: true,
                emailReceipts: true,
                whatsappUpdates: true,
                marketingEmails: false
            },
            marketing_consent: false,
            created_at: now,
            updated_at: now
        };

        await db.collection('users').insertOne(newUser);

        // Write an audit event
        await AuditService.recordEvent({
            entityType: 'user',
            entityId: customerId,
            action: 'user_registered',
            actorId: customerId,
            actorRole: 'customer',
            ipAddress: clientIp
        });

        const token = signJwt({ sub: internalDbId, email: formatted, role: 'customer' });
        
        return {
            token,
            user: {
                id: customerId,
                publicId: customerId,
                customerId,
                internalId: internalDbId,
                email: formatted,
                name: newUser.full_name,
                phone: newUser.phone,
                role: 'customer'
            }
        };
    }

    static async login(body: any, clientIp: string = 'unknown') {
        const { email, password, requiredRole, mfaCode } = body;
        
        if (!email || !password) {
            throw new BadRequestError('Email and password are required.');
        }

        const db = await getDb();
        const formatted = email.toLowerCase().trim();
        let user = await db.collection('users').findOne({ email: formatted });

        const envAdminEmail = (process.env.ADMIN_EMAIL || 'admin@laundelle.co.uk').toLowerCase().trim();
        const envAdminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'AdminPassword123!');

        // Check if login matches .env Admin Credentials
        if (envAdminPassword && formatted === envAdminEmail && password === envAdminPassword) {
            if (!user) {
                const adminId = 'usr_admin_default';
                const now = new Date().toISOString();
                const adminUser = {
                    _id: adminId as any,
                    email: envAdminEmail,
                    password: hashPassword(envAdminPassword),
                    full_name: 'System Administrator',
                    phone: '+447000000000',
                    role: 'super_admin',
                    avatar_url: `https://ui-avatars.com/api/?name=Admin&background=03045E&color=48CAE4&size=128`,
                    created_at: now,
                    updated_at: now
                };
                await db.collection('users').updateOne(
                    { email: envAdminEmail },
                    { $setOnInsert: adminUser },
                    { upsert: true }
                );
                user = await db.collection('users').findOne({ email: envAdminEmail });
            }
        }

        if (user) {
            // Check lockout
            if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
                const remainingMinutes = Math.ceil((new Date(user.lockoutUntil).getTime() - Date.now()) / (60 * 1000));
                throw new ForbiddenError(`Account is temporarily locked due to excessive failed login attempts. Try again in ${remainingMinutes} minute(s).`);
            }
        }

        const isPasswordValid = Boolean(user && user.password && verifyPassword(password, user.password));

        if (!user || !isPasswordValid) {
            if (user) {
                const nextFailed = (user.failedLoginAttempts || 0) + 1;
                const lockoutUntil = nextFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

                await db.collection('users').updateOne(
                    { _id: user._id } as any,
                    {
                        $set: {
                            failedLoginAttempts: nextFailed,
                            ...(lockoutUntil ? { lockoutUntil } : {})
                        }
                    }
                );

                await AuditService.recordEvent({
                    entityType: 'user',
                    entityId: String(user._id),
                    action: 'login_failed',
                    actorId: String(user._id),
                    actorRole: user.role || 'customer',
                    ipAddress: clientIp,
                    metadata: { failedAttempts: nextFailed, lockedOut: Boolean(lockoutUntil) }
                });

                if (lockoutUntil) {
                    throw new ForbiddenError('Account is temporarily locked due to 5 consecutive failed login attempts. Try again in 15 minutes.');
                }
            }
            throw new UnauthorizedError('Invalid email or password.');
        }

        if (user.is_blocked) {
            throw new ForbiddenError('This account has been suspended. Please contact support.');
        }

        // For non-customer roles, verify the role matches
        if (requiredRole && user.role !== requiredRole && user.role !== 'admin' && user.role !== 'super_admin') {
            throw new ForbiddenError('Access denied for this role.');
        }

        // Admin MFA validation
        if (['admin', 'super_admin'].includes(user.role) && user.mfaEnabled) {
            if (!mfaCode || String(mfaCode).trim() !== String(user.mfaSecret || '123456')) {
                throw new UnauthorizedError('Two-factor authentication code is required or invalid.');
            }
        }

        // Reset failed login attempts and seamlessly upgrade legacy password hash to modern salt
        const updateDoc: any = { failedLoginAttempts: 0, lockoutUntil: null };
        if (isLegacyHash(user.password)) {
            updateDoc.password = hashPassword(password);
            updateDoc.password_upgraded_at = new Date().toISOString();
        }

        await db.collection('users').updateOne(
            { _id: user._id } as any,
            { $set: updateDoc }
        );

        const now = new Date().toISOString();
        await AuditService.recordEvent({
            entityType: 'user',
            entityId: String(user._id),
            action: 'user_login',
            actorId: String(user._id),
            actorRole: user.role || 'customer',
            ipAddress: clientIp
        });

        const token = signJwt({ sub: String(user._id), email: formatted, role: user.role || 'customer' });
        
        const publicId = user.publicId || user.customerId || user.staffId || String(user._id);
        const isStaff = ['driver', 'processor', 'manager', 'admin', 'super_admin'].includes(user.role);
        return {
            token,
            user: { 
                id: publicId,
                publicId,
                customerId: !isStaff ? publicId : undefined,
                staffId: isStaff ? publicId : undefined,
                internalId: String(user._id),
                email: user.email, 
                name: user.full_name, 
                role: user.role || 'customer' 
            }
        };
    }

    /**
     * Records a failed login attempt and applies a 15-minute lockout upon 5 consecutive failures.
     */
    static async recordFailedLogin(email: string, clientIp: string = 'unknown') {
        const db = await getDb();
        const formatted = email.toLowerCase().trim();
        const user = await db.collection('users').findOne({ email: formatted });
        if (!user) return { locked: false, attempts: 0 };

        const nextFailed = (user.failedLoginAttempts || 0) + 1;
        const lockoutUntil = nextFailed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

        await db.collection('users').updateOne(
            { _id: user._id } as any,
            {
                $set: {
                    failedLoginAttempts: nextFailed,
                    ...(lockoutUntil ? { lockoutUntil } : {})
                }
            }
        );

        return { locked: Boolean(lockoutUntil), attempts: nextFailed, lockoutUntil };
    }

    /**
     * Resets failed login attempts after successful authentication.
     */
    static async resetFailedLogin(email: string) {
        const db = await getDb();
        const formatted = email.toLowerCase().trim();
        await db.collection('users').updateOne(
            { email: formatted },
            { $set: { failedLoginAttempts: 0, lockoutUntil: null } }
        );
        return { success: true };
    }

    /**
     * Checks if an account is currently locked out.
     */
    static async isAccountLocked(email: string): Promise<boolean> {
        const db = await getDb();
        const formatted = email.toLowerCase().trim();
        const user = await db.collection('users').findOne({ email: formatted });
        if (!user || !user.lockoutUntil) return false;
        return new Date(user.lockoutUntil) > new Date();
    }

    /**
     * Verifies Admin MFA TOTP / static code.
     */
    static verifyAdminMfa(user: any, mfaCode: string): boolean {
        if (!user.mfaEnabled) return true;
        const expected = String(user.mfaSecret || '123456').trim();
        return String(mfaCode).trim() === expected;
    }

    /**
     * Invalidate user session and revoke token on logout.
     */
    static async logout(token: string, userId?: string) {
        if (!token) return { success: true };
        await revokeToken(token, userId);
        return { success: true };
    }

    /**
     * Synchronizes an Auth0 authenticated user into MongoDB and returns a valid Laundelle backend JWT token.
     */
    static async syncAuth0User(body: any, clientIp: string = 'unknown') {
        const { email, name, sub, picture } = body || {};
        if (!email) {
            throw new BadRequestError('Email is required for Auth0 synchronization.');
        }

        const db = await getDb();
        const formatted = String(email).toLowerCase().trim();

        // Check if user already exists by auth0_sub or email
        const queryConditions: any[] = [{ email: formatted }];
        if (sub) {
            queryConditions.unshift({ auth0_sub: sub });
        }

        let user = await db.collection('users').findOne({ $or: queryConditions });
        const now = new Date().toISOString();

        if (!user) {
            const internalDbId = new ObjectId().toHexString();
            const customerId = generateCustomerId();
            const fullName = (name || formatted.split('@')[0] || 'Customer').trim();

            const newUser = {
                _id: internalDbId as any,
                publicId: customerId,
                customerId: customerId,
                id: customerId,
                email: formatted,
                auth0_sub: sub || null,
                full_name: fullName,
                phone: '',
                role: 'customer',
                avatar_url: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=03045E&color=CAF0F8&size=128`,
                wallet_balance: 0,
                reward_points: 0,
                customer_status: 'new',
                addresses: [],
                preferences: {
                    detergent: 'Standard',
                    softener: 'Standard',
                    fragrance: 'Fresh Linen',
                    foldingPreference: 'Standard Flat Fold',
                    starchedShirts: 'No Starch',
                    smsNotifications: true,
                    emailReceipts: true,
                    whatsappUpdates: true,
                    marketingEmails: false
                },
                marketing_consent: false,
                created_at: now,
                updated_at: now
            };

            await db.collection('users').insertOne(newUser);
            user = newUser;

            await AuditService.recordEvent({
                entityType: 'user',
                entityId: customerId,
                action: 'user_registered_auth0',
                actorId: customerId,
                actorRole: 'customer',
                ipAddress: clientIp
            });
        } else {
            const updateDoc: any = { updated_at: now };
            if (sub && !user.auth0_sub) updateDoc.auth0_sub = sub;
            if (picture && (!user.avatar_url || String(user.avatar_url).includes('ui-avatars.com'))) {
                updateDoc.avatar_url = picture;
            }
            if (name && (!user.full_name || user.full_name === formatted.split('@')[0])) {
                updateDoc.full_name = name;
            }
            if (Object.keys(updateDoc).length > 1) {
                await db.collection('users').updateOne(
                    { _id: user._id } as any,
                    { $set: updateDoc }
                );
            }
        }

        const internalId = String(user._id);
        const publicId = user.publicId || user.customerId || user.id || internalId;
        const role = user.role || 'customer';
        const token = signJwt({ sub: internalId, email: formatted, role });

        const phone = user.phone || '';
        const needsProfileCompletion = !phone || phone.trim() === '';

        return {
            token,
            needsProfileCompletion,
            user: {
                id: publicId,
                publicId,
                customerId: publicId,
                internalId,
                email: user.email,
                name: user.full_name,
                phone,
                role
            }
        };
    }
}

