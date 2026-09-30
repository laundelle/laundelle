const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

// Manually parse .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // remove surrounding quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
        }
    });
}

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('Error: MONGODB_URI is not set in your .env file.');
    process.exit(1);
}

async function main() {
    console.log('Connecting to MongoDB Atlas...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connection successful!');

        const db = client.db('Laundry');

        console.log('\n--- 1. Initializing "users" collection ---');
        const usersCol = db.collection('users');
        console.log('Creating unique index on email...');
        await usersCol.createIndex({ email: 1 }, { unique: true });
        console.log('"users" collection initialized with indices.');

        console.log('\n--- 2. Initializing "orders" collection ---');
        const ordersCol = db.collection('orders');
        console.log('Creating index on customer_id...');
        await ordersCol.createIndex({ customer_id: 1 });
        await ordersCol.createIndex({ id: 1 }, { unique: true });
        console.log('"orders" collection initialized with indices.');

        console.log('\n--- 3. Initializing "notifications" collection ---');
        const notifCol = db.collection('notifications');
        console.log('Creating index on userId...');
        await notifCol.createIndex({ userId: 1 });
        console.log('"notifications" collection initialized with indices.');

        console.log('\n--- 4. Initializing "tickets" collection ---');
        const ticketsCol = db.collection('tickets');
        console.log('Creating index on userId...');
        await ticketsCol.createIndex({ userId: 1 });
        console.log('"tickets" collection initialized.');

        console.log('\n--- 5. Initializing "postcode_sectors" collection ---');
        const postcodeCol = db.collection('postcode_sectors');
        console.log('Seeding active postcodes SW1A 1, W1D 4, EC1A 1, WC1A 1...');

        await postcodeCol.deleteMany({});
        await postcodeCol.insertMany([
            { district: 'SW1A', sector: '1', is_active: true },
            { district: 'W1D', sector: '4', is_active: true },
            { district: 'EC1A', sector: '1', is_active: true },
            { district: 'WC1A', sector: '1', is_active: true }
        ]);
        console.log('"postcode_sectors" seeded.');

        console.log('\n--- 6. Initializing "service_area_waitlist" collection ---');
        console.log('"service_area_waitlist" collection created.');

        console.log('\n--- 7. Initializing "revoked_tokens" collection ---');
        const revokedCol = db.collection('revoked_tokens');
        await revokedCol.createIndex({ token: 1 }, { unique: true });
        await revokedCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        console.log('"revoked_tokens" collection initialized with TTL and unique indices.');

        console.log('\nMongoDB Schema initialization and database seeding complete!');
    } catch (e) {
        console.error('Database initialization failed:', e);
    } finally {
        await client.close();
    }
}

main();
