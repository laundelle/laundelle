import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { getDb } from '../src/lib/mongodb';
import { Auth0Service } from '../src/services/Auth0Service';
import { AuditService } from '../src/services/AuditService';

// Ensure .env is loaded if running as standalone script
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim().replace(/^["']/, '').replace(/["']$/, '');
            if (!process.env[key]) {
                process.env[key] = val;
            }
        }
    }
}

export async function bootstrapSuperAdmin(): Promise<{
    auth0UserId: string;
    email: string;
    mongoId: string;
    action: 'created' | 'updated';
}> {
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (!adminEmail) {
        throw new Error('ADMIN_EMAIL environment variable is required to bootstrap Super Admin.');
    }
    const adminName = (process.env.ADMIN_NAME || 'System Administrator').trim();
    const pinnedSub = (process.env.BOOTSTRAP_ADMIN_SUB || process.env.ADMIN_AUTH0_SUB || '').trim();

    let auth0UserId = pinnedSub;

    console.log(`[Bootstrap] Initiating Super Admin bootstrap for: ${adminEmail}`);

    if (Auth0Service.isConfigured()) {
        try {
            console.log('[Bootstrap] Auth0 M2M is configured. Checking Auth0 user state...');
            let auth0User = await Auth0Service.getUserByEmail(adminEmail);

            if (!auth0User) {
                console.log('[Bootstrap] Provisioning Super Admin in Auth0 tenant...');
                auth0User = await Auth0Service.createUser({
                    email: adminEmail,
                    name: adminName,
                    role: 'super_admin',
                    emailVerified: true
                });
                console.log(`[Bootstrap] Created Auth0 user ID: ${auth0User.id}`);
            } else {
                console.log(`[Bootstrap] Found existing Auth0 user ID: ${auth0User.id}`);
            }

            auth0UserId = auth0User.id;

            // Ensure super_admin role assignment in Auth0
            try {
                await Auth0Service.assignRole(auth0UserId, 'super_admin');
                console.log('[Bootstrap] Ensured super_admin role assignment in Auth0.');
            } catch (roleErr: any) {
                console.warn(`[Bootstrap] Note on Auth0 role assignment: ${roleErr.message}`);
            }
        } catch (err: any) {
            console.warn(`[Bootstrap] Auth0 Management API notice: ${err.message}. Proceeding with local profile bootstrap.`);
        }
    } else {
        console.log('[Bootstrap] Auth0 M2M not configured in local environment. Proceeding with database provisioning.');
    }

    if (!auth0UserId) {
        auth0UserId = `auth0|bootstrap_${Buffer.from(adminEmail).toString('hex').substring(0, 16)}`;
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const query = {
        $or: [
            { auth0UserId },
            { auth0_sub: auth0UserId },
            { email: adminEmail }
        ]
    };

    const existingUser = await db.collection('users').findOne(query);

    if (existingUser) {
        await db.collection('users').updateOne(
            { _id: existingUser._id },
            {
                $set: {
                    auth0UserId,
                    auth0_sub: auth0UserId,
                    role: 'super_admin',
                    email_verified: true,
                    is_active: true,
                    customer_status: 'active',
                    updated_at: now
                }
            }
        );

        await AuditService.recordEvent({
            actorId: auth0UserId,
            actorRole: 'super_admin',
            action: 'super_admin_bootstrap_cli',
            entityType: 'user',
            entityId: String(existingUser._id),
            metadata: {
                auth0UserId,
                email: adminEmail,
                status: 'profile_updated'
            }
        });

        console.log(`[Bootstrap] Updated existing profile in MongoDB: ID ${existingUser._id}`);
        return {
            auth0UserId,
            email: adminEmail,
            mongoId: String(existingUser._id),
            action: 'updated'
        };
    }

    const internalDbId = new ObjectId().toHexString();
    const adminPublicId = `usr_adm_${internalDbId.substring(0, 8)}`;

    const newAdminProfile = {
        _id: internalDbId as any,
        publicId: adminPublicId,
        auth0UserId,
        auth0_sub: auth0UserId,
        email: adminEmail,
        full_name: adminName,
        phone: process.env.ADMIN_PHONE || '',
        role: 'super_admin',
        is_active: true,
        email_verified: true,
        customer_status: 'active',
        created_at: now,
        updated_at: now
    };

    await db.collection('users').insertOne(newAdminProfile);

    await AuditService.recordEvent({
        actorId: auth0UserId,
        actorRole: 'super_admin',
        action: 'super_admin_bootstrap_cli',
        entityType: 'user',
        entityId: internalDbId,
        metadata: {
            auth0UserId,
            email: adminEmail,
            status: 'profile_created'
        }
    });

    console.log(`[Bootstrap] Successfully created canonical Super Admin profile in MongoDB: ID ${internalDbId}`);
    return {
        auth0UserId,
        email: adminEmail,
        mongoId: internalDbId,
        action: 'created'
    };
}

// Execute when invoked directly
if (require.main === module) {
    bootstrapSuperAdmin()
        .then((res) => {
            console.log('\n====================================================');
            console.log('✅ SUPER ADMIN BOOTSTRAP COMPLETE');
            console.log('====================================================');
            console.log(`Email:         ${res.email}`);
            console.log(`Auth0 User ID: ${res.auth0UserId}`);
            console.log(`Mongo User ID: ${res.mongoId}`);
            console.log(`Result:        ${res.action}`);
            console.log('====================================================\n');
            process.exit(0);
        })
        .catch((err) => {
            console.error('\n❌ Super Admin bootstrap failed:', err);
            process.exit(1);
        });
}
