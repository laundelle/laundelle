import fs from 'fs';
import path from 'path';

// Ensure .env is loaded
const envPaths = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env')
];
for (const p of envPaths) {
    if (fs.existsSync(p)) {
        const envContent = fs.readFileSync(p, 'utf8');
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
}

import { getDb } from '../src/lib/mongodb';

async function healStaffActive() {
    console.log('--- Checking & Healing Staff is_active status in Database ---');
    const db = await getDb();

    // Find any drivers or processors where is_active is false but status is not explicitly 'suspended' or 'inactive'
    const result = await db.collection('users').updateMany(
        {
            role: { $in: ['driver', 'processor'] },
            is_active: false,
            status: { $nin: ['suspended', 'inactive'] }
        },
        {
            $set: {
                is_active: true,
                status: 'active'
            }
        }
    );

    console.log(`✓ Restored active account status for ${result.modifiedCount} driver(s)/processor(s).`);
}

healStaffActive()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error healing staff active status:', err);
        process.exit(1);
    });
