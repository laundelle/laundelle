import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface UserMigrationStatusReport {
    totalUsers: number;
    usersWithAuth0UserId: number;
    usersWithAuth0Sub: number;
    usersWithPasswordHash: number;
    usersRequiringMigration: number;
    roleBreakdown: Record<string, number>;
    duplicatesDetected: Array<{
        email: string;
        auth0_sub?: string;
        count: number;
        userIds: string[];
    }>;
    fieldInconsistencies: {
        legacyPlantIdCount: number; // users having plant_id
        canonicalPlantIdCount: number; // users having plantId
        legacyManagerIdCount: number; // users having manager_id
        canonicalManagerIdCount: number; // users having plantManagerId
    };
}

export class UserMigrationService {
    /**
     * Inspects the current MongoDB database and produces a non-destructive audit report.
     */
    public static async getMigrationReport(): Promise<UserMigrationStatusReport> {
        const db = await getDb();
        const users = await db.collection('users').find({}).toArray();

        const roleBreakdown: Record<string, number> = {};
        let usersWithAuth0UserId = 0;
        let usersWithAuth0Sub = 0;
        let usersWithPasswordHash = 0;
        let legacyPlantIdCount = 0;
        let canonicalPlantIdCount = 0;
        let legacyManagerIdCount = 0;
        let canonicalManagerIdCount = 0;

        const emailGroups = new Map<string, any[]>();
        const subGroups = new Map<string, any[]>();

        for (const u of users) {
            const role = u.role || 'customer';
            roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;

            if (u.auth0UserId) usersWithAuth0UserId++;
            if (u.auth0_sub) usersWithAuth0Sub++;
            if (u.password) usersWithPasswordHash++;

            if (u.plant_id) legacyPlantIdCount++;
            if (u.plantId) canonicalPlantIdCount++;
            if (u.manager_id) legacyManagerIdCount++;
            if (u.plantManagerId) canonicalManagerIdCount++;

            if (u.email) {
                const em = String(u.email).toLowerCase().trim();
                if (!emailGroups.has(em)) emailGroups.set(em, []);
                emailGroups.get(em)!.push(u);
            }

            if (u.auth0_sub) {
                const s = String(u.auth0_sub);
                if (!subGroups.has(s)) subGroups.set(s, []);
                subGroups.get(s)!.push(u);
            }
        }

        const duplicatesDetected: Array<{
            email: string;
            auth0_sub?: string;
            count: number;
            userIds: string[];
        }> = [];

        for (const [em, group] of emailGroups.entries()) {
            if (group.length > 1) {
                duplicatesDetected.push({
                    email: em,
                    auth0_sub: group[0].auth0_sub,
                    count: group.length,
                    userIds: group.map(u => String(u._id))
                });
            }
        }

        // Users needing migration: those without auth0UserId
        const usersRequiringMigration = users.filter(u => !u.auth0UserId).length;

        return {
            totalUsers: users.length,
            usersWithAuth0UserId,
            usersWithAuth0Sub,
            usersWithPasswordHash,
            usersRequiringMigration,
            roleBreakdown,
            duplicatesDetected,
            fieldInconsistencies: {
                legacyPlantIdCount,
                canonicalPlantIdCount,
                legacyManagerIdCount,
                canonicalManagerIdCount
            }
        };
    }

    /**
     * Safely links an existing MongoDB user to an Auth0 identity by updating auth0UserId.
     * Preserves internal _id, relationships, and legacy password hashes.
     */
    public static async linkUserAuth0Identity(
        mongoUserId: string,
        auth0UserId: string
    ): Promise<{ success: boolean; user: any }> {
        const db = await getDb();
        const formattedSub = auth0UserId.trim();

        // Check if another user already has this auth0UserId
        const existing = await db.collection('users').findOne({
            auth0UserId: formattedSub,
            _id: { $ne: mongoUserId } as any
        });

        if (existing) {
            throw new Error(`Another user (${existing.email}) is already linked to Auth0 ID ${formattedSub}`);
        }

        const updateDoc: any = {
            auth0UserId: formattedSub,
            auth0_sub: formattedSub, // Keep legacy field in sync during migration
            updated_at: new Date().toISOString()
        };

        const result = await db.collection('users').findOneAndUpdate(
            { _id: mongoUserId as any },
            { $set: updateDoc },
            { returnDocument: 'after' }
        );

        return { success: true, user: result };
    }

    /**
     * Non-destructively harmonizes relationship fields (sets plantId = plant_id and plantManagerId = manager_id)
     * without deleting the legacy fields, ensuring full backwards compatibility.
     */
    public static async harmonizeUserFields(mongoUserId: string): Promise<{ success: boolean }> {
        const db = await getDb();
        const user = await db.collection('users').findOne({ _id: mongoUserId as any });
        if (!user) return { success: false };

        const updateSet: Record<string, any> = {};

        // Harmonize plant ID
        if (user.plant_id && !user.plantId) {
            updateSet.plantId = user.plant_id;
        } else if (user.plantId && !user.plant_id) {
            updateSet.plant_id = user.plantId;
        }

        // Harmonize manager ID
        if (user.manager_id && !user.plantManagerId) {
            updateSet.plantManagerId = user.manager_id;
        } else if (user.plantManagerId && !user.manager_id) {
            updateSet.manager_id = user.plantManagerId;
        }

        // Harmonize name
        if (user.full_name && !user.name) {
            updateSet.name = user.full_name;
        } else if (user.name && !user.full_name) {
            updateSet.full_name = user.name;
        }

        if (Object.keys(updateSet).length > 0) {
            updateSet.updated_at = new Date().toISOString();
            await db.collection('users').updateOne(
                { _id: mongoUserId as any },
                { $set: updateSet }
            );
        }

        return { success: true };
    }
}
