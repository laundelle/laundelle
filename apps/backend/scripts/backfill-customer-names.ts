import path from 'path';
import fs from 'fs';

const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=');
            const key = trimmed.substring(0, idx).trim();
            let val = trimmed.substring(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.substring(1, val.length - 1);
            }
            if (!process.env[key]) {
                process.env[key] = val;
            }
        }
    });
}

import { getDb } from '../src/lib/mongodb';
import { OrderCustomerEnrichmentService } from '../src/services/OrderCustomerEnrichmentService';

async function main() {
    const db = await getDb();
    const orders = await db.collection('orders').find().toArray();
    console.log(`Found ${orders.length} orders to inspect and backfill.`);

    await OrderCustomerEnrichmentService.enrichOrders(orders, db);

    let updatedCount = 0;
    for (const order of orders) {
        const updateFields: any = {
            customerName: order.customerName,
            customer_name: order.customer_name,
            customerPhone: order.customerPhone,
            customer_phone: order.customer_phone,
            customerEmail: order.customerEmail,
            customer_email: order.customer_email
        };
        if (order.customer_id) {
            updateFields.customer_id = order.customer_id;
            updateFields.customerId = order.customer_id;
        }

        const res = await db.collection('orders').updateOne(
            { _id: order._id },
            { $set: updateFields }
        );
        if (res.modifiedCount > 0) updatedCount++;

        console.log(`Order ${order.id || order._id}: customerName='${order.customerName}', phone='${order.customerPhone}'`);
    }

    console.log(`Successfully backfilled ${updatedCount} orders.`);
    process.exit(0);
}

main().catch(err => {
    console.error('Error during backfill:', err);
    process.exit(1);
});
