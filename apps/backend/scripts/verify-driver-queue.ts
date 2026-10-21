import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';

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
import { DriverService } from '../src/services/DriverService';
import { ProcessorService } from '../src/services/ProcessorService';
import { locatePlantAndDriverForOrder } from '../src/services/OrderService';
import { StaffProvisioningService } from '../src/services/StaffProvisioningService';

async function runVerification() {
    console.log('--- Starting Driver & Processor Status & Queue Assignment Verification ---');
    const db = await getDb();
    const now = new Date().toISOString();

    // 1. Setup a test plant
    const testPlantId = 'test-plant-active-queue-' + Date.now();
    await db.collection('plants').insertOne({
        _id: testPlantId as any,
        id: testPlantId,
        name: 'Queue Test Plant',
        code: 'QTP',
        service_pincodes: ['PR1', 'PR2', 'SW1A'],
        status: 'ACTIVE',
        created_at: now
    });

    // 2. Setup a test driver assigned to this plant
    const testDriverId = 'test-driver-queue-' + Date.now();
    await db.collection('users').insertOne({
        _id: testDriverId as any,
        id: testDriverId,
        email: `driver_${Date.now()}@test.com`,
        full_name: 'Test Driver Active',
        role: 'driver',
        plant_id: testPlantId,
        assigned_postcodes: ['PR1', 'PR2'],
        is_active: false,
        availability: 'off-duty',
        vehicle: 'Logistics Van Test',
        created_at: now
    });

    // 3. Setup a test processor assigned to this plant
    const testProcessorId = 'test-proc-queue-' + Date.now();
    await db.collection('users').insertOne({
        _id: testProcessorId as any,
        id: testProcessorId,
        email: `proc_${Date.now()}@test.com`,
        full_name: 'Test Processor Active',
        role: 'processor',
        plant_id: testPlantId,
        is_active: false,
        availability: 'offline',
        created_at: now
    });

    try {
        // Assertion 1: When driver is offline, locatePlantAndDriverForOrder returns NO driver
        const routeOffline = await locatePlantAndDriverForOrder(db, 'PR1 1AA', '123 High St, PR1 1AA', now);
        console.log('Assertion 1: Driver offline routing test...');
        if (routeOffline.driverId === testDriverId) {
            throw new Error('FAIL: Offline driver should not have been selected for routing!');
        }
        console.log('✓ PASS: Offline driver was correctly NOT selected for order routing.');

        // Assertion 2: Place an order while driver is offline -> stays in queue
        const queuedOrderId = 'ORD-QUEUE-TEST-' + Date.now();
        await db.collection('orders').insertOne({
            _id: queuedOrderId as any,
            id: queuedOrderId,
            publicId: queuedOrderId,
            plant_id: testPlantId,
            assigned_driver_id: null,
            driver: null,
            status: 'waiting_for_driver',
            statusLabel: 'Waiting for Driver',
            postcode: 'PR1 1AA',
            address: '123 High St, PR1 1AA',
            createdAt: now,
            updated_at: now
        });

        const orderBeforeOnline = await db.collection('orders').findOne({ id: queuedOrderId });
        if (orderBeforeOnline.assigned_driver_id !== null || orderBeforeOnline.status !== 'waiting_for_driver') {
            throw new Error('FAIL: Order should be queued with status waiting_for_driver and null driver!');
        }
        console.log('✓ PASS: Order safely placed in queue waiting_for_driver.');

        // Assertion 3: Driver toggles online -> triggers auto-assignment of queued order
        console.log('Assertion 3: Driver toggling online and auto-assigning from queue...');
        const toggleResult = await DriverService.updateAvailability(testDriverId, true);
        if (!toggleResult.success || !toggleResult.isAvailable || toggleResult.queuedAssigned < 1) {
            throw new Error(`FAIL: updateAvailability failed or did not assign queued order. Result: ${JSON.stringify(toggleResult)}`);
        }
        console.log(`✓ PASS: Driver toggled online and assigned ${toggleResult.queuedAssigned} queued order(s).`);

        // Verify order in database now has the assigned driver
        const orderAfterOnline = await db.collection('orders').findOne({ id: queuedOrderId });
        if (orderAfterOnline.assigned_driver_id !== testDriverId || orderAfterOnline.status !== 'collection_scheduled') {
            throw new Error(`FAIL: Queued order was not assigned to online driver! Order state: ${JSON.stringify(orderAfterOnline)}`);
        }
        console.log('✓ PASS: Queued order was successfully assigned to the newly active driver with collection_scheduled!');

        // Assertion 4: Delivery order queued when driver offline
        await DriverService.updateAvailability(testDriverId, false); // Driver goes offline
        const deliveryOrderId = 'ORD-DELIV-QUEUE-' + Date.now();
        await db.collection('orders').insertOne({
            _id: deliveryOrderId as any,
            id: deliveryOrderId,
            publicId: deliveryOrderId,
            plant_id: testPlantId,
            assigned_driver_id: null,
            driver: null,
            status: 'waiting_for_driver',
            statusLabel: 'Waiting for Driver',
            postcode: 'PR1 2BB',
            address: '456 Delivery Lane, PR1 2BB',
            qr_tracking: { intakeAt: now }, // indicates completed plant intake
            createdAt: now,
            updated_at: now
        });

        // Driver comes back online -> auto-assigns delivery order
        const toggleResult2 = await DriverService.updateAvailability(testDriverId, true);
        if (toggleResult2.queuedAssigned < 1) {
            throw new Error('FAIL: Queued delivery order was not assigned when driver came online!');
        }
        const deliveryAfter = await db.collection('orders').findOne({ id: deliveryOrderId });
        if (deliveryAfter.assigned_driver_id !== testDriverId || deliveryAfter.status !== 'ready_for_delivery') {
            throw new Error(`FAIL: Delivery order status mismatch! Status: ${deliveryAfter.status}, driver: ${deliveryAfter.assigned_driver_id}`);
        }
        console.log('✓ PASS: Queued delivery order was successfully assigned to online driver with ready_for_delivery!');

        // Assertion 5: Processor availability toggle test
        console.log('Assertion 5: Processor availability toggle test...');
        const procResult = await ProcessorService.updateAvailability(testProcessorId, 'available');
        if (!procResult.success || procResult.availability !== 'available') {
            throw new Error(`FAIL: ProcessorService.updateAvailability failed. Result: ${JSON.stringify(procResult)}`);
        }
        const procDoc = await db.collection('users').findOne({ _id: testProcessorId as any });
        if (procDoc.availability !== 'available' || procDoc.is_active !== true) {
            throw new Error(`FAIL: Processor DB document did not sync availability or is_active! ${JSON.stringify(procDoc)}`);
        }
        console.log('✓ PASS: Processor availability toggle accurately updated DB state.');

        // Assertion 6: Manager staff update API test
        console.log('Assertion 6: Manager updating staff availability via StaffProvisioningService...');
        // Toggle driver offline via Manager update
        const mockManagerContext: any = {
            dbUser: { role: 'super_admin', _id: 'admin_sys' },
            token: { sub: 'admin_sys', role: 'super_admin' }
        };
        await StaffProvisioningService.updateUser(mockManagerContext, testDriverId, {
            availability: 'offline'
        });
        const driverDocAfterMgr = await db.collection('users').findOne({ _id: testDriverId as any });
        if (driverDocAfterMgr.availability !== 'offline' || driverDocAfterMgr.is_active !== true) {
            throw new Error(`FAIL: Manager update did not set driver offline or deactivated account! ${JSON.stringify(driverDocAfterMgr)}`);
        }
        console.log('✓ PASS: Manager staff update correctly toggled driver offline while preserving active account status.');

        console.log('\n======================================================');
        console.log('ALL DRIVER & PROCESSOR STATUS & QUEUE ASSERTIONS PASSED!');
        console.log('======================================================');
    } finally {
        // Clean up test records
        await db.collection('plants').deleteOne({ _id: testPlantId as any });
        await db.collection('users').deleteMany({ _id: { $in: [testDriverId as any, testProcessorId as any] } });
        await db.collection('orders').deleteMany({ plant_id: testPlantId });
    }
}

runVerification()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('VERIFICATION ERROR:', err);
        process.exit(1);
    });
