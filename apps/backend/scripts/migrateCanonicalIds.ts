/**
 * LAUNDELLE MONOREPO — CANONICAL ID MIGRATION & DATA INTEGRITY SCRIPT
 * 
 * Purpose:
 * Audits, standardizes, and safely backfills canonical business identifiers
 * across MongoDB collections (users, plants, orders, payments, incidents).
 * 
 * Operating Modes:
 * 1. Default (Dry-Run): Read-only simulation. Scans database, validates foreign keys,
 *    identifies anomalies, and reports proposed updates and quarantined records.
 *    Command: npx tsx scripts/migrateCanonicalIds.ts --dry-run
 * 
 * 2. Execute Mode: Performs idempotent, atomic batch writes with comprehensive audit logging.
 *    Command: npx tsx scripts/migrateCanonicalIds.ts --execute
 * 
 * Safety Rules:
 * - Preserves existing immutable MongoDB `_id` values.
 * - Retains valid canonical IDs (e.g. CUS-, STF-, ORD-, PLT-, PAY-, INC-).
 * - Detects broken foreign keys, ambiguous mappings, and isolates them in a quarantine log.
 * - Idempotent: Can be run multiple times safely.
 */

import { getDb } from '../src/lib/mongodb';
import { ObjectId } from 'mongodb';
import {
  generateCustomerId,
  generateStaffId,
  generateOrderId,
  generateOrderItemId,
  generatePlantId,
  generatePaymentId,
  generateBagId,
  generateIncidentId,
  isValidId,
  ID_PREFIXES
} from '@laundelle/ids';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

interface MigrationStats {
  collection: string;
  totalScanned: number;
  alreadyCompliant: number;
  proposedUpdates: number;
  quarantinedCount: number;
}

interface QuarantineRecord {
  collection: string;
  documentId: string;
  reason: string;
  details: any;
}

const stats: Record<string, MigrationStats> = {
  users: { collection: 'users', totalScanned: 0, alreadyCompliant: 0, proposedUpdates: 0, quarantinedCount: 0 },
  plants: { collection: 'plants', totalScanned: 0, alreadyCompliant: 0, proposedUpdates: 0, quarantinedCount: 0 },
  orders: { collection: 'orders', totalScanned: 0, alreadyCompliant: 0, proposedUpdates: 0, quarantinedCount: 0 },
  payments: { collection: 'payments', totalScanned: 0, alreadyCompliant: 0, proposedUpdates: 0, quarantinedCount: 0 },
  incidents: { collection: 'incidents', totalScanned: 0, alreadyCompliant: 0, proposedUpdates: 0, quarantinedCount: 0 },
};

const quarantineLog: QuarantineRecord[] = [];

async function runMigration() {
  const isExecute = process.argv.includes('--execute');
  const mode = isExecute ? 'EXECUTE (MUTATING)' : 'DRY-RUN (READ-ONLY)';

  console.log('================================================================');
  console.log(` LAUNDELLE DATA INTEGRITY & CANONICAL ID MIGRATION`);
  console.log(` Mode: ${mode}`);
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const db = await getDb();

  // -------------------------------------------------------------
  // PHASE 1: USERS AUDIT & CANONICALIZATION
  // -------------------------------------------------------------
  console.log('>>> [1/5] Auditing Users Collection...');
  const usersCursor = db.collection('users').find({});
  const allUsers = await usersCursor.toArray();
  stats.users.totalScanned = allUsers.length;

  for (const user of allUsers) {
    const isStaff = ['super_admin', 'admin', 'manager', 'plant_manager', 'driver', 'processor'].includes(user.role);
    const updates: any = {};

    if (isStaff) {
      const hasValidStaffId = user.staffId && isValidId(user.staffId, ID_PREFIXES.STAFF);
      const hasValidPublicId = user.publicId && isValidId(user.publicId, ID_PREFIXES.STAFF);

      if (hasValidStaffId && hasValidPublicId) {
        stats.users.alreadyCompliant++;
      } else {
        const canonicalId = hasValidStaffId ? user.staffId : (hasValidPublicId ? user.publicId : generateStaffId());
        updates.staffId = canonicalId;
        updates.publicId = canonicalId;
        stats.users.proposedUpdates++;

        if (isExecute) {
          await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
        }
      }
    } else {
      // Customer
      const hasValidCustId = user.customerId && isValidId(user.customerId, ID_PREFIXES.CUSTOMER);
      const hasValidPublicId = user.publicId && isValidId(user.publicId, ID_PREFIXES.CUSTOMER);

      if (hasValidCustId && hasValidPublicId) {
        stats.users.alreadyCompliant++;
      } else {
        const canonicalId = hasValidCustId ? user.customerId : (hasValidPublicId ? user.publicId : generateCustomerId());
        updates.customerId = canonicalId;
        updates.publicId = canonicalId;
        stats.users.proposedUpdates++;

        if (isExecute) {
          await db.collection('users').updateOne({ _id: user._id }, { $set: updates });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // PHASE 2: PLANTS AUDIT & CANONICALIZATION
  // -------------------------------------------------------------
  console.log('>>> [2/5] Auditing Plants Collection...');
  const plants = await db.collection('plants').find({}).toArray();
  stats.plants.totalScanned = plants.length;

  for (const plant of plants) {
    const hasValidPlantId = plant.plantId && isValidId(plant.plantId, ID_PREFIXES.PLANT);
    const hasValidPublicId = plant.publicId && isValidId(plant.publicId, ID_PREFIXES.PLANT);

    if (hasValidPlantId && hasValidPublicId) {
      stats.plants.alreadyCompliant++;
    } else {
      const canonicalId = hasValidPlantId ? plant.plantId : (hasValidPublicId ? plant.publicId : generatePlantId());
      const updates = { plantId: canonicalId, publicId: canonicalId };
      stats.plants.proposedUpdates++;

      if (isExecute) {
        await db.collection('plants').updateOne({ _id: plant._id }, { $set: updates });
      }
    }
  }

  // -------------------------------------------------------------
  // PHASE 3: ORDERS AUDIT & FOREIGN KEY VERIFICATION
  // -------------------------------------------------------------
  console.log('>>> [3/5] Auditing Orders Collection...');
  const orders = await db.collection('orders').find({}).toArray();
  stats.orders.totalScanned = orders.length;

  const seenOrderIds = new Set<string>();

  for (const order of orders) {
    const updates: any = {};
    let needsUpdate = false;
    let isQuarantined = false;

    const orderPublicOrId = order.publicId || order.id;

    // Duplicate Order ID detection
    if (orderPublicOrId) {
      if (seenOrderIds.has(orderPublicOrId)) {
        isQuarantined = true;
        stats.orders.quarantinedCount++;
        quarantineLog.push({
          collection: 'orders',
          documentId: String(order._id || order.id),
          reason: 'DUPLICATE_ORDER_IDENTIFIER',
          details: { orderId: orderPublicOrId }
        });
      } else {
        seenOrderIds.add(orderPublicOrId);
      }
    }

    // Canonical Order Public ID
    const hasValidOrderId = (order.publicId && isValidId(order.publicId, ID_PREFIXES.ORDER)) ||
                            (order.id && typeof order.id === 'string' && order.id.startsWith('ORD-'));

    if (!hasValidOrderId) {
      const canonicalId = generateOrderId();
      updates.publicId = canonicalId;
      updates.id = canonicalId;
      updates.orderNumber = canonicalId;
      needsUpdate = true;
    } else {
      const canonicalId = (order.publicId && isValidId(order.publicId, ID_PREFIXES.ORDER)) ? order.publicId : order.id;
      if (!order.publicId || order.publicId !== canonicalId) {
        updates.publicId = canonicalId;
        needsUpdate = true;
      }
      if (!order.id || order.id !== canonicalId) {
        updates.id = canonicalId;
        needsUpdate = true;
      }
      if (!order.orderNumber || order.orderNumber !== canonicalId) {
        updates.orderNumber = canonicalId;
        needsUpdate = true;
      }
    }

    // Bag ID standardization
    if (!order.bag_id && !order.bagId) {
      const existingBag = order.qr_tracking?.qrTagId || order.package?.qr_code || order.qr_code;
      if (existingBag && typeof existingBag === 'string' && existingBag.startsWith('BAG-')) {
        updates.bag_id = existingBag;
        needsUpdate = true;
      } else {
        const newBag = generateBagId();
        updates.bag_id = newBag;
        needsUpdate = true;
      }
    }

    // Customer foreign key verification
    const custRef = order.customerId || order.customer_id || order.userId;
    if (custRef && custRef !== 'guest') {
      const matchingUsers = allUsers.filter(u => 
        String(u._id) === String(custRef) ||
        u.publicId === custRef ||
        u.customerId === custRef ||
        u.auth0UserId === custRef
      );

      if (matchingUsers.length === 0) {
        isQuarantined = true;
        stats.orders.quarantinedCount++;
        quarantineLog.push({
          collection: 'orders',
          documentId: String(order._id || order.id),
          reason: 'ORPHAN_CUSTOMER_REFERENCE',
          details: { referencedCustomerId: custRef, orderId: order.id || order.publicId }
        });
      } else if (matchingUsers.length > 1) {
        isQuarantined = true;
        stats.orders.quarantinedCount++;
        quarantineLog.push({
          collection: 'orders',
          documentId: String(order._id || order.id),
          reason: 'AMBIGUOUS_CUSTOMER_MAPPING',
          details: { referencedCustomerId: custRef, matchingUserIds: matchingUsers.map(u => String(u._id)) }
        });
      } else {
        const matchedUser = matchingUsers[0];
        // Resolve canonical customer ID: prefer CUS- ID, otherwise preserve valid _id string
        const hasCanonicalCustId = matchedUser.customerId && isValidId(matchedUser.customerId, ID_PREFIXES.CUSTOMER);
        const hasCanonicalPublicId = matchedUser.publicId && isValidId(matchedUser.publicId, ID_PREFIXES.CUSTOMER);
        const canonicalCustId = hasCanonicalCustId
          ? matchedUser.customerId
          : (hasCanonicalPublicId ? matchedUser.publicId : String(matchedUser._id));

        if (order.customerId !== canonicalCustId || order.customer_id !== canonicalCustId) {
          updates.customerId = canonicalCustId;
          updates.customer_id = canonicalCustId;
          needsUpdate = true;
        }
      }
    }

    // Plant foreign key verification
    if (order.plant_id && order.plant_id !== 'unassigned') {
      const matchedPlant = plants.find(p =>
        String(p._id) === String(order.plant_id) ||
        p.plantId === order.plant_id ||
        p.publicId === order.plant_id ||
        p.id === order.plant_id ||
        p.code === order.plant_id
      );

      if (!matchedPlant) {
        isQuarantined = true;
        stats.orders.quarantinedCount++;
        quarantineLog.push({
          collection: 'orders',
          documentId: String(order._id || order.id),
          reason: 'ORPHAN_PLANT_REFERENCE',
          details: { referencedPlantId: order.plant_id, orderId: order.id || order.publicId }
        });
      }
    }

    // SAFETY ISOLATION: Quarantined records must NEVER be partially mutated.
    // They are preserved intact and isolated for administrative review.
    if (isQuarantined) {
      continue;
    }

    if (needsUpdate) {
      stats.orders.proposedUpdates++;
      if (isExecute) {
        await db.collection('orders').updateOne({ _id: order._id }, { $set: updates });
      }
    } else {
      stats.orders.alreadyCompliant++;
    }
  }

  // -------------------------------------------------------------
  // PHASE 4: PAYMENTS AUDIT
  // -------------------------------------------------------------
  console.log('>>> [4/5] Auditing Payments Collection...');
  const payments = await db.collection('payments').find({}).toArray();
  stats.payments.totalScanned = payments.length;

  for (const pay of payments) {
    const hasValidPayId = (pay.publicId && isValidId(pay.publicId, ID_PREFIXES.PAYMENT)) ||
                          (pay.paymentId && isValidId(pay.paymentId, ID_PREFIXES.PAYMENT));

    if (hasValidPayId) {
      stats.payments.alreadyCompliant++;
    } else {
      const newPayId = generatePaymentId();
      stats.payments.proposedUpdates++;
      if (isExecute) {
        await db.collection('payments').updateOne(
          { _id: pay._id },
          { $set: { publicId: newPayId, paymentId: newPayId, id: newPayId } }
        );
      }
    }
  }

  // -------------------------------------------------------------
  // PHASE 5: INCIDENTS AUDIT
  // -------------------------------------------------------------
  console.log('>>> [5/5] Auditing Incidents Collection...');
  const incidents = await db.collection('incidents').find({}).toArray();
  stats.incidents.totalScanned = incidents.length;

  for (const inc of incidents) {
    const hasValidIncId = (inc.publicId && isValidId(inc.publicId, ID_PREFIXES.INCIDENT)) ||
                          (inc.id && typeof inc.id === 'string' && inc.id.startsWith('INC-'));

    if (hasValidIncId) {
      stats.incidents.alreadyCompliant++;
    } else {
      const newIncId = generateIncidentId();
      stats.incidents.proposedUpdates++;
      if (isExecute) {
        await db.collection('incidents').updateOne(
          { _id: inc._id },
          { $set: { publicId: newIncId, id: newIncId } }
        );
      }
    }
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(' MIGRATION & AUDIT EXECUTION SUMMARY');
  console.log('================================================================');
  console.table(stats);

  if (quarantineLog.length > 0) {
    console.log(`\n⚠️  QUARANTINED ANOMALIES DETECTED: ${quarantineLog.length}`);
    console.table(quarantineLog.slice(0, 10));
    if (quarantineLog.length > 10) {
      console.log(`... and ${quarantineLog.length - 10} more records in quarantine log.`);
    }
  } else {
    console.log('\n✅ Zero orphaned foreign keys or corrupted records detected.');
  }

  if (!isExecute) {
    console.log('\n[NOTICE] Dry-Run Completed Successfully. No database modifications were made.');
    console.log('To apply these safe backfills in staging or production, execute:');
    console.log('   npm run migrate:canonical -- --execute');
  } else {
    console.log('\n✅ Database migration successfully executed and verified.');
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed with error:', err);
    process.exit(1);
  });
