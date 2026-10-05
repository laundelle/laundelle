import { getDb } from './mongodb';

let indexesEnsured = false;

/**
 * Ensures optimal MongoDB database indexes for production performance,
 * concurrency safety, and fast query execution across all collections.
 */
export async function ensureDatabaseIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();

    // 1. Orders collection
    await Promise.all([
      db.collection('orders').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('orders').createIndex({ id: 1 }, { unique: true, background: true }),
      // Stripe can retry and multiple servers can receive a delivery concurrently.
      // The session ID must map to at most one official order.
      db.collection('orders').createIndex({ stripe_session_id: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('orders').createIndex({ customer_id: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ customerId: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ plant_id: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ plantId: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ assigned_driver_id: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ assigned_processor_id: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ status: 1, createdAt: -1 }, { background: true }),
      db.collection('orders').createIndex({ pickupDate: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ deliveryDate: 1, status: 1 }, { background: true }),
      db.collection('orders').createIndex({ 'sla.deadlineAt': 1 }, { background: true })
    ]);

    // 2. Order Items collection (Garment tracking)
    await Promise.all([
      db.collection('order_items').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('order_items').createIndex({ orderId: 1, qcStatus: 1 }, { background: true }),
      db.collection('order_items').createIndex({ orderId: 1, currentStage: 1 }, { background: true })
    ]);

    // 3. Pickup Attempts
    await Promise.all([
      db.collection('pickup_attempts').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('pickup_attempts').createIndex({ orderId: 1, createdAt: -1 }, { background: true }),
      db.collection('pickup_attempts').createIndex({ driverId: 1, createdAt: -1 }, { background: true })
    ]);

    // 4. Delivery Attempts
    await Promise.all([
      db.collection('delivery_attempts').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('delivery_attempts').createIndex({ orderId: 1, createdAt: -1 }, { background: true }),
      db.collection('delivery_attempts').createIndex({ driverId: 1, createdAt: -1 }, { background: true })
    ]);

    // 5. Operational Exceptions
    await Promise.all([
      db.collection('exceptions').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('exceptions').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('exceptions').createIndex({ plantId: 1, status: 1, priority: 1 }, { background: true }),
      db.collection('exceptions').createIndex({ orderId: 1, status: 1 }, { background: true })
    ]);

    // 6. Machine Runs
    await Promise.all([
      db.collection('machine_runs').createIndex({ runId: 1 }, { unique: true, background: true }),
      db.collection('machine_runs').createIndex({ machineId: 1, status: 1 }, { background: true }),
      db.collection('machine_runs').createIndex({ plantId: 1, status: 1 }, { background: true })
    ]);

    // 7. COD Collections
    await Promise.all([
      db.collection('cod_collections').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('cod_collections').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('cod_collections').createIndex({ orderId: 1 }, { background: true }),
      db.collection('cod_collections').createIndex({ reconciliationStatus: 1 }, { background: true }),
      db.collection('cod_collections').createIndex({ driverId: 1, collectedAt: -1 }, { background: true })
    ]);

    // 8. Evidence Metadata
    await Promise.all([
      db.collection('evidence').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('evidence').createIndex({ fileId: 1 }, { unique: true, background: true }),
      db.collection('evidence').createIndex({ orderId: 1, type: 1 }, { background: true })
    ]);

    // 9. Notifications
    await Promise.all([
      db.collection('notifications').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 }, { background: true })
    ]);

    // 10. Audit Log (Tamper-evident chain)
    await Promise.all([
      db.collection('audit_log').createIndex({ entityId: 1, timestamp: -1 }, { background: true }),
      db.collection('audit_log').createIndex({ actorId: 1, timestamp: -1 }, { background: true }),
      db.collection('audit_log').createIndex({ action: 1, timestamp: -1 }, { background: true }),
      db.collection('audit_log').createIndex({ currentHash: 1 }, { background: true })
    ]);

    // 11. Files Collection (Metadata & Checksums)
    await Promise.all([
      db.collection('files').createIndex({ fileId: 1 }, { unique: true, background: true }),
      db.collection('files').createIndex({ orderId: 1, fileType: 1 }, { background: true }),
      db.collection('files').createIndex({ checksum: 1 }, { background: true }),
      db.collection('files').createIndex({ retentionUntil: 1 }, { background: true })
    ]);

    // 12. Subscriptions Collection
    await Promise.all([
      db.collection('subscriptions').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('subscriptions').createIndex({ customerId: 1, status: 1 }, { background: true }),
      db.collection('subscriptions').createIndex({ nextBillingAt: 1 }, { background: true })
    ]);

    // 13. Notification Templates
    await Promise.all([
      db.collection('notification_templates').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('notification_templates').createIndex({ eventType: 1, channel: 1 }, { background: true })
    ]);

    // 14. Privacy Requests
    await Promise.all([
      db.collection('privacy_requests').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('privacy_requests').createIndex({ userId: 1, status: 1 }, { background: true })
    ]);

    // 15. Machines Fleet
    await Promise.all([
      db.collection('machines').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('machines').createIndex({ plantId: 1, status: 1 }, { background: true }),
      db.collection('machines').createIndex({ machineCode: 1 }, { background: true })
    ]);

    // 16. Revoked Tokens
    await Promise.all([
      db.collection('revoked_tokens').createIndex({ token: 1 }, { unique: true, background: true }),
      db.collection('revoked_tokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    ]);

    // 17. Vehicles Fleet (P2)
    await Promise.all([
      db.collection('vehicles').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('vehicles').createIndex({ registrationNumber: 1 }, { unique: true, background: true }),
      db.collection('vehicles').createIndex({ plantId: 1, status: 1 }, { background: true }),
      db.collection('vehicles').createIndex({ currentDriverId: 1 }, { background: true })
    ]);

    // 18. Vehicle Assignments (P2 Lineage)
    await Promise.all([
      db.collection('vehicle_assignments').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('vehicle_assignments').createIndex({ vehicleId: 1, status: 1 }, { background: true }),
      db.collection('vehicle_assignments').createIndex({ driverId: 1, status: 1 }, { background: true }),
      db.collection('vehicle_assignments').createIndex({ assignedAt: -1 }, { background: true })
    ]);

    // 19. Vehicle Maintenance (P2)
    await Promise.all([
      db.collection('vehicle_maintenance').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('vehicle_maintenance').createIndex({ vehicleId: 1, performedDate: -1 }, { background: true }),
      db.collection('vehicle_maintenance').createIndex({ plantId: 1 }, { background: true })
    ]);

    // 20. Inventory Items (P2)
    await Promise.all([
      db.collection('inventory_items').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('inventory_items').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('inventory_items').createIndex({ plantId: 1, sku: 1 }, { unique: true, background: true }),
      db.collection('inventory_items').createIndex({ plantId: 1, category: 1 }, { background: true }),
      db.collection('inventory_items').createIndex({ plantId: 1, isLowStock: 1 }, { background: true })
    ]);

    // 21. Inventory Transactions (P2 Ledger)
    await Promise.all([
      db.collection('inventory_transactions').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('inventory_transactions').createIndex({ itemId: 1, performedAt: -1 }, { background: true }),
      db.collection('inventory_transactions').createIndex({ plantId: 1, performedAt: -1 }, { background: true }),
      db.collection('inventory_transactions').createIndex({ referenceId: 1 }, { background: true })
    ]);

    // 22. Inventory Transfers (P2 Inter-plant)
    await Promise.all([
      db.collection('inventory_transfers').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('inventory_transfers').createIndex({ sourcePlantId: 1, status: 1 }, { background: true }),
      db.collection('inventory_transfers').createIndex({ destinationPlantId: 1, status: 1 }, { background: true }),
      db.collection('inventory_transfers').createIndex({ requestedAt: -1 }, { background: true })
    ]);

    // 23. Registered Devices (P2 Offline sync)
    await Promise.all([
      db.collection('registered_devices').createIndex({ deviceId: 1 }, { unique: true, background: true }),
      db.collection('registered_devices').createIndex({ userId: 1, status: 1 }, { background: true }),
      db.collection('registered_devices').createIndex({ lastSyncAt: -1 }, { background: true })
    ]);

    // 24. Offline Sync Queue (P2)
    await Promise.all([
      db.collection('offline_sync_queue').createIndex({ operationId: 1 }, { unique: true, background: true }),
      db.collection('offline_sync_queue').createIndex({ deviceId: 1, syncStatus: 1 }, { background: true }),
      db.collection('offline_sync_queue').createIndex({ clientTimestamp: 1 }, { background: true })
    ]);

    // 25. Unified Alerts (P2 Alert Center)
    await Promise.all([
      db.collection('unified_alerts').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('unified_alerts').createIndex({ id: 1 }, { unique: true, background: true }),
      db.collection('unified_alerts').createIndex({ plantId: 1, resolved: 1, severity: 1 }, { background: true }),
      db.collection('unified_alerts').createIndex({ createdAt: -1 }, { background: true })
    ]);

    // 26. Users (Canonical Customer & Staff Identity)
    await Promise.all([
      db.collection('users').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('users').createIndex({ customerId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('users').createIndex({ staffId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('users').createIndex({ role: 1 }, { background: true })
    ]);

    // 27. Plants & Facilities
    await Promise.all([
      db.collection('plants').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('plants').createIndex({ code: 1 }, { unique: true, sparse: true, background: true })
    ]);

    // 28. Payments
    await Promise.all([
      db.collection('payments').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('payments').createIndex({ orderId: 1 }, { background: true }),
      db.collection('payments').createIndex({ customerId: 1 }, { background: true })
    ]);

    // 29. Incidents & Disputes
    await Promise.all([
      db.collection('incidents').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('incidents').createIndex({ orderId: 1 }, { background: true }),
      db.collection('incidents').createIndex({ plant_id: 1 }, { background: true })
    ]);

    // 30. Support Tickets
    await Promise.all([
      db.collection('tickets').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('tickets').createIndex({ ticketId: 1 }, { unique: true, sparse: true, background: true })
    ]);

    // 31. Services Catalog
    await Promise.all([
      db.collection('services').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('services').createIndex({ id: 1 }, { unique: true, background: true })
    ]);

    // 32. Booking Slots
    await Promise.all([
      db.collection('booking_slots').createIndex({ publicId: 1 }, { unique: true, sparse: true, background: true }),
      db.collection('booking_slots').createIndex({ id: 1 }, { unique: true, background: true })
    ]);

    indexesEnsured = true;
    console.log('[Laundelle DB] Production indexes successfully validated & ensured.');

    // Run IdMigrationService to backfill canonical publicIds
    try {
      const { IdMigrationService } = await import('@/services/IdMigrationService');
      const migrationRes = await IdMigrationService.runMigration();
      console.log('[Laundelle DB] Canonical ID migration verified:', migrationRes);
    } catch (migErr: any) {
      console.warn('[Laundelle DB] Canonical ID migration notice:', migErr.message);
    }
  } catch (err: any) {
    console.warn('[Laundelle DB] Index initialization warning:', err.message);
  }
}
