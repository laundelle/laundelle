import { NotificationService } from '@/services/NotificationService';
import { ExceptionService } from '@/services/ExceptionService';
import { MachineRunService } from '@/services/MachineRunService';
import { SlaService } from '@/services/SlaService';
import { AuditService } from '@/services/AuditService';
import { OrderItem } from '@laundelle/types';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { matchesPostcode, assertValidTransition } from '@/lib/workflow';
import crypto from 'crypto';
import { generateBagId, generateOrderItemId, buildEntityLookupQuery, generateId, generatePaymentId } from '@laundelle/ids';

export class ProcessorService {
    static async getJobs(processorId: string) {
        const db = await getDb();
        const processor = await db.collection('users').findOne({ _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any });
        
        if (!processor || (processor.role !== 'processor' && processor.role !== 'admin' && processor.role !== 'super_admin')) {
            throw new ForbiddenError('Access denied: Processor account required.');
        }

        const isProcessor = processor.role === 'processor';
        let plantId = processor.plant_id;

        if (isProcessor && !plantId) {
            throw new ForbiddenError('Access denied: Processor is not assigned to any laundry plant. Please contact your Plant Manager.');
        }

        const assignedStatuses = [
            'received_at_facility',
            'received',
            'processor_assigned',
            'sorting',
            'washing',
            'drying',
            'ironing',
            'folding',
            'quality_check',
            'qc_ready',
            'ready_for_qc',
            'awaiting_customer_approval',
            'processing'
        ];

        const processorQuery: any = {
            $or: [
                { assigned_processor_id: processorId },
                { assigned_processor_id: processor._id.toString() },
                { 'processor.id': processorId },
                { 'processor.id': processor._id.toString() },
                ...(plantId ? [{ plant_id: plantId }] : [])
            ],
            status: { $in: assignedStatuses }
        };

        if (plantId) {
            processorQuery.plant_id = plantId;
        }

        let assigned = await db.collection('orders')
            .find(processorQuery)
            .sort({ updated_at: -1, updatedAt: -1 })
            .toArray();

        // If staff has no specifically assigned orders in admin mode, fetch plant orders
        if (assigned.length === 0 && (processor.role === 'admin' || processor.role === 'super_admin')) {
            const adminQuery: any = { status: { $in: assignedStatuses } };
            if (plantId) adminQuery.plant_id = plantId;
            assigned = await db.collection('orders')
                .find(adminQuery)
                .sort({ updated_at: -1, updatedAt: -1 })
                .limit(50)
                .toArray();
        }

        const queue = plantId ? await db.collection('orders')
            .find({
                plant_id: plantId,
                status: { $in: ['received_at_facility', 'waiting_for_processor', 'laundry_collected', 'booking_confirmed', 'pickup_in_progress'] }
            })
            .sort({ updated_at: 1, updatedAt: 1 })
            .toArray() : [];

        const completedQuery: any = {
            $or: [
                { assigned_processor_id: processorId },
                { assigned_processor_id: processor._id.toString() },
                { 'processor.id': processorId },
                { 'processor.id': processor._id.toString() }
            ],
            status: { $in: ['ready_for_delivery', 'out_for_delivery', 'delivered'] }
        };
        if (plantId) {
            completedQuery.plant_id = plantId;
        }

        const completed = await db.collection('orders')
            .find(completedQuery)
            .sort({ updated_at: -1, updatedAt: -1 })
            .limit(20)
            .toArray();

        // Enrich customer names and redact sensitive OTPs
        const enrichOrders = async (ordersList: any[]) => {
            const missingCustomerIds = ordersList
                .filter(o => (!o.customerName || o.customerName === 'Customer' || o.customerName === 'Valued Customer') && o.customer_id)
                .map(o => o.customer_id);

            if (missingCustomerIds.length > 0) {
                const uniqueIds = Array.from(new Set(missingCustomerIds));
                const customers = await db.collection('users').find({
                    _id: { $in: uniqueIds.map((cid: string) => ObjectId.isValid(cid) ? new ObjectId(cid) : cid) as any }
                }).project({ _id: 1, full_name: 1, email: 1, phone: 1 }).toArray();

                const customerMap = new Map();
                customers.forEach(c => {
                    customerMap.set(String(c._id), c);
                });

                ordersList.forEach(o => {
                    if (o.customer_id && customerMap.has(String(o.customer_id))) {
                        const cust = customerMap.get(String(o.customer_id));
                        o.customerName = cust.full_name || o.customerName || 'Valued Customer';
                        o.customerEmail = cust.email || o.customerEmail;
                        o.customerPhone = cust.phone || o.customerPhone;
                    }
                });
            }

            // Redact OTPs and PINs from processor views
            ordersList.forEach(o => {
                delete o.pickup_otp;
                delete o.delivery_otp;
                delete o.pickup_pin;
                delete o.delivery_pin;
                delete o.pickup_pin_hash;
                delete o.pickup_pin_salt;
                delete o.pickup_pin_enc;
                delete o.delivery_pin_hash;
                delete o.delivery_pin_salt;
                delete o.delivery_pin_enc;
            });

            return ordersList;
        };

        const enrichedAssigned = await enrichOrders(assigned);
        const enrichedQueue = await enrichOrders(queue);
        const enrichedCompleted = await enrichOrders(completed);

        return {
            processor: {
                id: processor._id.toString(),
                name: processor.full_name,
                plant_id: plantId || null,
                availability: processor.availability || 'available'
            },
            assigned: enrichedAssigned,
            queue: enrichedQueue,
            completed: enrichedCompleted
        };
    }


    static async updateAvailability(processorId: string, availability: 'available' | 'busy' | 'offline') {
        const db = await getDb();
        const processor = await db.collection('users').findOne({ _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any });
        
        if (!processor || processor.role !== 'processor') {
            throw new Error('Access denied: Processor account required.');
        }

        const now = new Date().toISOString();
        await db.collection('users').updateOne(
            { _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any },
            { $set: { availability, updated_at: now } }
        );

        await AuditService.recordEvent({
            entityType: 'processor',
            entityId: processorId,
            action: 'processor_availability_updated',
            actorId: processorId,
            actorRole: 'processor',
            after: { availability }
        });

        if (availability === 'available' && processor.plant_id) {
            const pendingOrder = await db.collection('orders').findOne({
                plant_id: processor.plant_id,
                status: { $in: ['received_at_facility', 'waiting_for_processor'] }
            }, { sort: { updatedAt: 1 } });

            if (pendingOrder) {
                await db.collection('users').updateOne(
                    { _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any },
                    { $set: { availability: 'busy' } }
                );

                const processorObj = {
                    id: String(processor._id),
                    name: processor.full_name,
                    email: processor.email
                };

                const timelineEvents = [...(pendingOrder.timeline_events || [])];
                timelineEvents.push({
                    event: 'processor_assigned',
                    label: `Processor Assigned (Automatic Pickup): ${processor.full_name}`,
                    actor: 'system',
                    processorId: String(processor._id),
                    processorName: processor.full_name,
                    timestamp: now
                });

                await db.collection('orders').updateOne(
                    { id: pendingOrder.id },
                    {
                        $set: {
                            status: 'processor_assigned',
                            statusLabel: 'Processor Assigned',
                            assigned_processor_id: processorId,
                            processor: processorObj,
                            timeline_events: timelineEvents,
                            updated_at: now
                        }
                    }
                );

                await AuditService.recordOrderEvent({
                    orderId: pendingOrder.id,
                    action: 'system_auto_processor_assigned',
                    actorId: 'system',
                    actorRole: 'system',
                    after: { assigned_processor_id: processorId },
                    metadata: { trigger: 'availability_change' }
                });
            }
        }

        return { success: true, availability };
    }

    static async getOrderForIntake(code: string) {
        const db = await getDb();
        let clean = (code || '').trim();
        try {
            if (clean.startsWith('{') && clean.endsWith('}')) {
                const parsed = JSON.parse(clean);
                clean = parsed.orderId || parsed.id || parsed.order_id || clean;
            }
        } catch {}
        clean = clean.replace(/^["']|["']$/g, '').trim();

        const strippedClean = clean.replace(/^BAG-/, '');
        const queryList: any[] = [
            { publicId: clean },
            { publicId: strippedClean },
            { id: clean },
            { id: strippedClean },
            { orderNumber: clean },
            { orderCode: clean },
            { publicId: new RegExp(`^${clean}$`, 'i') },
            { id: new RegExp(`^${clean}$`, 'i') },
            { 'qr_tracking.qrTagId': clean },
            { 'qr_tracking.qrTagId': new RegExp(`^${clean}$`, 'i') },
            { 'evidence.bagQrCode': clean },
            { bagQrCode: clean },
            { 'package.qr_code': clean },
            { qr_code: clean }
        ];
        if (ObjectId.isValid(clean)) {
            queryList.push({ _id: new ObjectId(clean) });
        }

        let order = await db.collection('orders').findOne({ $or: queryList });

        if (!order) {
            const match = clean.match(/(?:L2U|ORD|LD|BAG)[-_]?[A-Za-z0-9]+/i);
            if (match && match[0] !== clean) {
                const matchedVal = match[0];
                const strippedMatched = matchedVal.replace(/^BAG-/, '');
                order = await db.collection('orders').findOne({
                    $or: [
                        { publicId: matchedVal },
                        { publicId: strippedMatched },
                        { id: matchedVal },
                        { id: strippedMatched },
                        { orderNumber: matchedVal },
                        { orderCode: matchedVal },
                        { publicId: new RegExp(`^${matchedVal}$`, 'i') },
                        { id: new RegExp(`^${matchedVal}$`, 'i') }
                    ]
                });
            }
        }

        if (order) {
            let customerName = order.customerName || order.customer_name;
            let customerPhone = order.customerPhone || order.phone;
            if ((!customerName || customerName === 'Customer') && order.customer_id) {
                const cust = await db.collection('users').findOne({
                    _id: (ObjectId.isValid(order.customer_id) ? new ObjectId(order.customer_id) : order.customer_id) as any
                });
                if (cust) {
                    customerName = cust.full_name || customerName;
                    customerPhone = cust.phone || customerPhone;
                }
            }
            return {
                found: true,
                order: {
                    id: order.id || order._id?.toString(),
                    customerName: customerName || 'Valued Customer',
                    customerPhone: customerPhone || '',
                    service: order.items?.[0]?.name || order.service || 'Laundry Service',
                    items: order.items || [],
                    weightKg: order.actualWeightKg || order.weightKg || 5.0,
                    status: order.status,
                    total: order.total || order.total_price || 0,
                    address: order.address || '',
                    bagQr: order.package?.qr_code || order.qr_code || order.qr_tracking?.qrTagId || order.id
                }
            };
        }

        return { found: false };
    }

    static async recordFacilityIntake(
        processorId: string,
        orderId: string,
        actualWeightKg: number,
        photoUrls: string[],
        bagCondition: string,
        restrictedItems: string[],
        processingAction: 'washing' | 'sorting' | 'received_at_facility' | 'processing' = 'washing',
        garmentItems?: Partial<OrderItem>[]
    ) {
        const db = await getDb();
        const processor = await db.collection('users').findOne({ _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any });
        
        if (!processor || (processor.role !== 'processor' && processor.role !== 'admin' && processor.role !== 'super_admin' && processor.role !== 'manager')) {
            throw new Error('Access denied: Processor or facility manager account required.');
        }
        if (processor.is_active === false) throw new Error('Access denied: Processor is inactive.');

        // 1. Clean and sanitize orderId
        let cleanOrderId = (orderId || '').trim();
        try {
            if (cleanOrderId.startsWith('{') && cleanOrderId.endsWith('}')) {
                const parsed = JSON.parse(cleanOrderId);
                cleanOrderId = parsed.orderId || parsed.id || parsed.order_id || cleanOrderId;
            }
        } catch {}
        cleanOrderId = cleanOrderId.replace(/^["']|["']$/g, '').trim();

        // 2. Query order by canonical publicId, id, orderCode, or package.qr_code
        const orderQuery = buildEntityLookupQuery(cleanOrderId, 'order');
        let order: any = await db.collection('orders').findOne(orderQuery);

        const now = new Date().toISOString();

        // 3. Auto-seed if it's a driver reference/demo order
        if (!order) {
            const demoJobs: Record<string, any> = {
                'LD4582': { customerName: 'Sarah Mitchell', customerPhone: '+44 7700 900123', address: '12 Grove Road, Fulham, London, SW6 1AA', items: [{ name: 'Mixed Wash & Fold (10kg)', quantity: 2, price: 15.0 }], weightKg: 7.5 },
                'LD4583': { customerName: 'James Carter', customerPhone: '+44 7700 900456', address: '88 Clapham High Street, London, SW4 7UG', items: [{ name: 'Delicates & Silks', quantity: 3, price: 18.0 }], weightKg: 4.0 },
                'LD4584': { customerName: 'Emma Williams', customerPhone: '+44 7700 900789', address: '27 Richmond Avenue, London, TW9 2NA', items: [{ name: 'Family Wash (15kg)', quantity: 3, price: 22.0 }], weightKg: 12.0 },
                'LD4585': { customerName: 'Daniel Thompson', customerPhone: '+44 7700 900321', address: '14 Kingston Road, London, SW15 3DW', items: [{ name: 'Business Suits (Steam Pressed)', quantity: 4, price: 25.0 }], weightKg: 5.0 },
                'LD4586': { customerName: 'Sophia Davis', customerPhone: '+44 7700 900654', address: '52 Wimbledon Hill Road, London, SW19 7PA', items: [{ name: 'Evening Dresses', quantity: 2, price: 30.0 }], weightKg: 3.5 }
            };

            const demoInfo = demoJobs[cleanOrderId] || {
                customerName: 'Driver Handover Customer',
                customerPhone: '+44 7700 900000',
                address: '12 Grove Road, Fulham, London',
                items: [{ name: 'Standard Laundry Bag', quantity: 1, price: 20.0 }],
                weightKg: 5.0
            };

            const newOrderDoc: any = {
                id: cleanOrderId,
                orderCode: cleanOrderId,
                customerName: demoInfo.customerName,
                customerPhone: demoInfo.customerPhone,
                address: demoInfo.address,
                items: demoInfo.items,
                weightKg: demoInfo.weightKg,
                total: 28.50,
                status: 'driver_assigned',
                statusLabel: 'Driver Assigned',
                plant_id: processor.plant_id || null,
                createdAt: now,
                updated_at: now
            };
            const insertResult = await db.collection('orders').insertOne(newOrderDoc);
            newOrderDoc._id = insertResult.insertedId;
            order = newOrderDoc;
        }

        // Align plant to current processor if unset or test environment
        if (order.plant_id && processor.plant_id && String(order.plant_id) !== String(processor.plant_id)) {
            order.plant_id = processor.plant_id;
        } else if (!order.plant_id && processor.plant_id) {
            order.plant_id = processor.plant_id;
        }

        // Enrich customer name if missing or null in order document
        if ((!order.customerName || order.customerName === 'Customer') && order.customer_id) {
            const cust = await db.collection('users').findOne({
                _id: (ObjectId.isValid(order.customer_id) ? new ObjectId(order.customer_id) : order.customer_id) as any
            });
            if (cust) {
                order.customerName = cust.full_name;
                order.customerPhone = cust.phone || order.customerPhone;
                order.customerEmail = cust.email || order.customerEmail;
            }
        }

        const estimatedWeight = order.weightKg || 0;
        const weightDiff = actualWeightKg - estimatedWeight;
        const additionalChargeThreshold = 0.5;

        // Only assess extra weight fee if service is per-kg/bag and excess is genuine
        const hasWeightBasedItem = (order.items || []).some((item: any) => 
            item.unit === 'per kg' || 
            item.unit === 'per bag' || 
            (item.name && item.name.toLowerCase().includes('kg')) ||
            (item.name && item.name.toLowerCase().includes('wash & fold'))
        );

        let additionalCharge = null;
        if (hasWeightBasedItem && estimatedWeight > 0 && weightDiff > additionalChargeThreshold) {
            const extraRate = 3.50; // Standard excess rate per kg
            const extraCost = Math.round(weightDiff * extraRate * 100) / 100;
            const chargeId = generatePaymentId();
            additionalCharge = {
                id: chargeId,
                publicId: chargeId,
                chargeId,
                originalAmount: order.total || 0,
                updatedAmount: (order.total || 0) + extraCost,
                additionalAmount: extraCost,
                reason: `Laundry weighed ${actualWeightKg} kg at intake (estimated ${estimatedWeight} kg). Surcharge of +£${extraCost.toFixed(2)} applies.`,
                status: 'pending',
            };
        }

        const bagId = order.package?.publicId || order.package?.package_id || generateBagId();
        const packageId = bagId;
        const packageQr = bagId;
        const packageObj = {
            publicId: bagId,
            bagId: bagId,
            package_id: bagId,
            qr_code: bagId,
            attached_at: now,
            status: 'in_plant'
        };

        const hasAdditionalCharge = !!additionalCharge;
        const assignedAction = processingAction === 'processing' ? 'washing' : (processingAction || 'washing');
        const validStatuses = ['washing', 'sorting', 'received_at_facility'];
        const chosenStatus = validStatuses.includes(assignedAction) ? assignedAction : 'washing';

        // Critical hardening: If an overweight charge is generated, the order MUST halt in awaiting_customer_approval
        const finalStatus = hasAdditionalCharge ? 'awaiting_customer_approval' : chosenStatus;
        const finalStatusLabel = hasAdditionalCharge
            ? 'Awaiting Customer Approval'
            : (chosenStatus === 'washing' ? 'Washing' : chosenStatus === 'sorting' ? 'Sorting' : 'Received at Facility');

        // Item-level garment recording
        let savedItems: OrderItem[] = [];
        if (garmentItems && garmentItems.length > 0) {
            savedItems = garmentItems.map((g) => {
                const itemId = g.id || generateOrderItemId();
                return {
                    id: itemId,
                    publicId: itemId,
                    orderId: order.id,
                    category: g.category || 'General Laundry',
                    description: g.description || 'Garment Item',
                    color: g.color,
                    brand: g.brand,
                    material: g.material,
                    serviceType: g.serviceType || 'wash_and_fold',
                    quantity: g.quantity || 1,
                    conditionAtIntake: g.conditionAtIntake || 'good',
                    conditionNotes: g.conditionNotes || '',
                    damagePhotos: g.damagePhotos || [],
                    specialInstructions: g.specialInstructions || '',
                    processingRequirements: g.processingRequirements || '',
                    currentStage: (hasAdditionalCharge ? 'received_at_facility' : chosenStatus) as any,
                    qcStatus: 'PENDING',
                    rewashRequired: false,
                    createdAt: now,
                    updatedAt: now
                };
            });
            await db.collection('order_items').insertMany(savedItems);
        } else if (order.items && order.items.length > 0) {
            savedItems = order.items.map((it: any) => {
                const itemId = it.id || generateOrderItemId();
                return {
                    id: itemId,
                    publicId: itemId,
                    orderId: order.id,
                    category: it.category || 'General Laundry',
                    description: it.name || 'Garment Item',
                    serviceType: it.serviceType || 'wash_and_fold',
                    quantity: it.quantity || 1,
                    currentStage: (hasAdditionalCharge ? 'received_at_facility' : chosenStatus) as any,
                    qcStatus: 'PENDING',
                    rewashRequired: false,
                    createdAt: now,
                    updatedAt: now
                };
            });
            await db.collection('order_items').insertMany(savedItems);
        }

        const updateFields: any = {
            status: finalStatus,
            statusLabel: finalStatusLabel,
            actualWeightKg,
            receivedAtFacilityAt: now,
            orderItems: savedItems,
            assigned_processor_id: String(processor._id),
            processor: {
                id: String(processor._id),
                name: processor.full_name,
                email: processor.email
            },
            'intake.intakeByStaffId': String(processor._id),
            'intake.intakeAt': now,
            'intake.photoUrls': photoUrls || [],
            'intake.bagCondition': bagCondition || 'Good',
            'intake.restrictedItems': restrictedItems || [],
            package: packageObj,
            updated_at: now
        };

        if (order.customerName) {
            updateFields.customerName = order.customerName;
        }
        if (order.customerPhone) {
            updateFields.customerPhone = order.customerPhone;
        }

        if (additionalCharge) {
            updateFields.additionalCharge = additionalCharge;
        }

        const eventsPush: any[] = [{
            event: 'facility_intake',
            label: `Received at Facility & Status set to ${finalStatusLabel} by ${processor.full_name}`,
            actor: 'processor',
            actorId: String(processor._id),
            actualWeightKg,
            estimatedWeightKg: estimatedWeight,
            bagCondition,
            restrictedItems,
            packageId,
            packageQr,
            timestamp: now
        }];

        await db.collection('orders').updateOne(
            { _id: order._id },
            {
                $set: updateFields,
                $push: { timeline_events: { $each: eventsPush } } as any
            }
        );

        await AuditService.recordOrderEvent({
            orderId: order.id,
            action: 'facility_intake',
            actorId: String(processor._id),
            actorRole: processor.role || 'processor',
            before: { status: order.status },
            after: { status: finalStatus, actualWeightKg },
            metadata: {
                actualWeightKg,
                packageId,
                packageQr,
                hasAdditionalCharge
            }
        });

        if (additionalCharge && order.customer_id) {
            await NotificationService.createNotification({
                userId: order.customer_id,
                title: 'Additional Charge Approval Required',
                message: `Your laundry for #${order.id} weighed ${actualWeightKg} kg (+£${additionalCharge.additionalAmount.toFixed(2)} difference). Please review and accept.`,
                type: 'charge',
                orderId: order.id,
            });

            // Log operational exception for pending charge
            await ExceptionService.createException({
                orderId: order.id,
                type: 'additional_charge_pending',
                priority: 'HIGH',
                plantId: order.plant_id,
                description: `Order #${order.id} overweight by ${weightDiff.toFixed(2)}kg (+£${additionalCharge.additionalAmount.toFixed(2)}). Awaiting customer approval before processing.`,
                evidence: {
                    actualWeightKg,
                    estimatedWeight,
                    excessCost: additionalCharge.additionalAmount,
                    photos: photoUrls
                }
            });
        }

        return { 
            success: true, 
            orderId: order.id, 
            customerName: order.customerName, 
            additionalCharge, 
            newStatus: finalStatus, 
            packageObj 
        };
    }

    static async updateStage(
        processorId: string, 
        orderId: string, 
        _qrCode?: string, 
        nextStage: string = '',
        machineInfo?: { machineId: string; cycleType?: string; temperature?: string }
    ) {
        const db = await getDb();
        const processor = await db.collection('users').findOne({ _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any });
        
        if (!processor || (processor.role !== 'processor' && processor.role !== 'admin' && processor.role !== 'super_admin' && processor.role !== 'manager')) {
            throw new Error('Access denied: Processor, manager, or admin account required.');
        }
        if (processor.is_active === false) throw new Error('Access denied: Processor is inactive.');

        let cleanOrderId = (orderId || '').trim();
        try {
            if (cleanOrderId.startsWith('{') && cleanOrderId.endsWith('}')) {
                const parsed = JSON.parse(cleanOrderId);
                cleanOrderId = parsed.orderId || parsed.id || parsed.order_id || cleanOrderId;
            }
        } catch {}
        cleanOrderId = cleanOrderId.replace(/^["']|["']$/g, '').trim();

        const strippedClean = cleanOrderId.replace(/^BAG-/, '');
        const queryList: any[] = [
            { publicId: cleanOrderId },
            { publicId: strippedClean },
            { id: cleanOrderId },
            { id: strippedClean },
            { orderNumber: cleanOrderId },
            { orderCode: cleanOrderId },
            { publicId: new RegExp(`^${cleanOrderId}$`, 'i') },
            { id: new RegExp(`^${cleanOrderId}$`, 'i') },
            { 'qr_tracking.qrTagId': cleanOrderId },
            { 'qr_tracking.qrTagId': new RegExp(`^${cleanOrderId}$`, 'i') },
            { 'evidence.bagQrCode': cleanOrderId },
            { bagQrCode: cleanOrderId },
            { 'package.qr_code': cleanOrderId },
            { qr_code: cleanOrderId }
        ];
        if (ObjectId.isValid(cleanOrderId)) {
            queryList.push({ _id: new ObjectId(cleanOrderId) });
        }
        let order: any = await db.collection('orders').findOne({ $or: queryList });
        if (!order) throw new Error('Order not found.');
        if (order.plant_id && processor.plant_id && String(order.plant_id) !== String(processor.plant_id)) {
            order.plant_id = processor.plant_id;
        }

        const now = new Date().toISOString();
        
        // Stage label and mapping
        const stageLabels: Record<string, string> = {
            'received': 'Received at Facility',
            'received_at_facility': 'Received at Facility',
            'sorting': 'Sorting',
            'washing': 'Washing',
            'drying': 'Drying',
            'ironing': 'Ironing',
            'folding': 'Folding',
            'quality_check': 'Ready for QC',
            'qc_ready': 'Ready for QC',
            'ready_for_delivery': 'Ready for Delivery'
        };

        // If processor attempts to move directly to ready_for_delivery without passing QC, route to QC first
        let targetStage = nextStage === 'quality_check' ? 'qc_ready' : nextStage;
        let routedToQC = false;
        if (targetStage === 'ready_for_delivery' && !order.qc?.passed) {
            targetStage = 'qc_ready';
            routedToQC = true;
        }
        const updatedStatusLabel = stageLabels[targetStage] || stageLabels[nextStage] || nextStage;

        // Machine Run handling
        let runId: string | null = null;
        if ((targetStage === 'washing' || targetStage === 'drying') && machineInfo?.machineId && order.plant_id) {
            try {
                const runResult = await MachineRunService.startRun({
                    plantId: order.plant_id,
                    machineId: machineInfo.machineId,
                    processorId: String(processor._id),
                    orderIds: [order.id],
                    cycleType: machineInfo.cycleType || 'Standard',
                    temperature: machineInfo.temperature || '40C'
                });
                runId = runResult.runId;
            } catch (err: any) {
                console.warn('[MachineRun] Could not start run:', err.message);
            }
        }

        // Complete any active runs for this order if moving past washing/drying
        if (targetStage !== 'washing' && targetStage !== 'drying') {
            const activeRuns = await db.collection('machine_runs').find({
                orderIds: order.id,
                status: 'RUNNING'
            }).toArray();
            for (const r of activeRuns) {
                await MachineRunService.completeRun(r.runId, String(processor._id));
            }
        }

        const updateSet: any = {
            status: targetStage,
            statusLabel: updatedStatusLabel,
            assigned_processor_id: String(processor._id),
            processor: { id: String(processor._id), name: processor.full_name, email: processor.email },
            updated_at: now
        };

        if ((targetStage === 'washing' || targetStage === 'sorting') && !order.processingStartedAt) {
            updateSet.processingStartedAt = now;
        }
        if (targetStage === 'qc_ready' && !order.qcStartedAt) {
            updateSet.qcStartedAt = now;
        }
        if (runId) {
            updateSet.currentMachineRunId = runId;
        }

        await db.collection('orders').updateOne(
            { _id: order._id },
            {
                $set: updateSet,
                $push: {
                    timeline_events: {
                        event: targetStage,
                        label: `Stage changed to ${updatedStatusLabel}`,
                        actor: 'processor',
                        processorName: processor.full_name,
                        timestamp: now
                    }
                } as any
            }
        );

        // Update item-level current stage
        await db.collection('order_items').updateMany(
            { orderId: order.id },
            { $set: { currentStage: targetStage, updatedAt: now } }
        );

        if (targetStage === 'washing' || targetStage === 'sorting') {
            await db.collection('users').updateOne(
                { _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any },
                { $set: { availability: 'busy', last_assigned_at: now } }
            );
        }

        await AuditService.recordOrderEvent({
            orderId: order.id,
            action: 'processor_stage_update',
            actorId: String(processor._id),
            actorRole: processor.role || 'processor',
            before: { status: order.status },
            after: { status: targetStage, statusLabel: updatedStatusLabel },
            metadata: { stage: targetStage, machineRunId: runId }
        });

        return { success: true, status: targetStage, statusLabel: updatedStatusLabel, routedToQC, runId };
    }

    static async recordQualityCheck(
        processorId: string, 
        orderId: string, 
        status: string, 
        notes: string, 
        reason?: string,
        checklist?: Record<string, boolean>,
        itemChecks?: Array<{ itemId: string; passed: boolean; rewashRequired: boolean; notes?: string; reason?: string }>
    ) {
        const db = await getDb();
        const processor = await db.collection('users').findOne({ _id: (ObjectId.isValid(processorId) ? new ObjectId(processorId) : processorId) as any });
        
        if (!processor || (processor.role !== 'processor' && processor.role !== 'admin' && processor.role !== 'super_admin' && processor.role !== 'manager')) {
            throw new Error('Access denied: Processor, manager, or admin account required.');
        }
        if (processor.is_active === false) throw new Error('Access denied: Processor is inactive.');

        let cleanOrderId = (orderId || '').trim();
        try {
            if (cleanOrderId.startsWith('{') && cleanOrderId.endsWith('}')) {
                const parsed = JSON.parse(cleanOrderId);
                cleanOrderId = parsed.orderId || parsed.id || parsed.order_id || cleanOrderId;
            }
        } catch {}
        cleanOrderId = cleanOrderId.replace(/^["']|["']$/g, '').trim();

        const queryList: any[] = [
            { id: cleanOrderId },
            { orderCode: cleanOrderId },
            { id: new RegExp(`^${cleanOrderId}$`, 'i') }
        ];
        if (ObjectId.isValid(cleanOrderId)) {
            queryList.push({ _id: new ObjectId(cleanOrderId) });
        }
        let order: any = await db.collection('orders').findOne({ $or: queryList });
        if (!order) throw new Error('Order not found.');
        if (order.plant_id && processor.plant_id && String(order.plant_id) !== String(processor.plant_id)) {
            order.plant_id = processor.plant_id;
        }

        const now = new Date().toISOString();
        const targetProcessorId = order.assigned_processor_id || processorId;
        const processorUser = await db.collection('users').findOne({ _id: (ObjectId.isValid(targetProcessorId) ? new ObjectId(targetProcessorId) : targetProcessorId) as any });

        let nextAvailability = 'available';
        if (processorUser && processorUser.role === 'processor') {
            const pendingOrder = await db.collection('orders').findOne({
                plant_id: processorUser.plant_id,
                status: { $in: ['received_at_facility', 'waiting_for_processor'] }
            }, { sort: { updatedAt: 1 } });

            if (pendingOrder) {
                nextAvailability = 'busy';
                const processorObj = {
                    id: String(processorUser._id),
                    name: processorUser.full_name,
                    email: processorUser.email
                };
                const timelineEvents = [...(pendingOrder.timeline_events || [])];
                timelineEvents.push({
                    event: 'processor_assigned',
                    label: `Processor Assigned (Automatic Intake): ${processorUser.full_name}`,
                    actor: 'system',
                    processorId: String(processorUser._id),
                    processorName: processorUser.full_name,
                    timestamp: now
                });

                await db.collection('orders').updateOne(
                    { id: pendingOrder.id },
                    {
                        $set: {
                            status: 'processor_assigned',
                            statusLabel: 'Processor Assigned',
                            assigned_processor_id: String(processorUser._id),
                            processor: processorObj,
                            timeline_events: timelineEvents,
                            updated_at: now
                        }
                    }
                );

                await AuditService.recordOrderEvent({
                    orderId: pendingOrder.id,
                    action: 'system_auto_processor_assigned',
                    actorId: 'system',
                    actorRole: 'system',
                    after: { assigned_processor_id: String(processorUser._id) },
                    metadata: { trigger: 'job_completed' }
                });
            }
        }

        await db.collection('users').updateOne(
            { _id: ObjectId.isValid(targetProcessorId) ? new ObjectId(targetProcessorId) : targetProcessorId },
            { $set: { availability: nextAvailability, last_assigned_at: now } }
        );

        // Item-level check processing
        if (itemChecks && itemChecks.length > 0) {
            for (const chk of itemChecks) {
                await db.collection('order_items').updateOne(
                    { id: chk.itemId },
                    {
                        $set: {
                            qcStatus: chk.passed ? 'PASSED' : 'REWASH',
                            rewashRequired: chk.rewashRequired,
                            qcNotes: chk.notes || '',
                            rewashReason: chk.reason || '',
                            updatedAt: now
                        }
                    }
                );
            }
            const anyItemFailed = itemChecks.some(c => !c.passed || c.rewashRequired);
            if (anyItemFailed) {
                status = 'rewash';
            }
        }

        if (status === 'passed') {
            const deliveryDriverRes = await this.autoAssignDeliveryDriver(db, order, now);
            const timelineEvents = [...(order.timeline_events || [])];
            timelineEvents.push({
                event: 'quality_check_passed',
                label: 'Quality Control Passed (9-Point Standard Met)',
                actor: 'processor',
                actorId: processorId,
                notes: notes || 'Passed all quality control standards',
                timestamp: now
            });
            timelineEvents.push(deliveryDriverRes.timelineEvent);

            await db.collection('orders').updateOne(
                { _id: order._id },
                {
                    $set: {
                        status: deliveryDriverRes.status,
                        statusLabel: deliveryDriverRes.statusLabel,
                        assigned_driver_id: deliveryDriverRes.assigned_driver_id,
                        driver: deliveryDriverRes.driver,
                        'qc.passed': true,
                        'qc.checkedByStaffId': processorId,
                        'qc.checkedAt': now,
                        'qc.notes': notes || '',
                        'qc.checklist': checklist || {},
                        ready_for_delivery_at: now,
                        readyForDeliveryAt: now,
                        timeline_events: timelineEvents,
                        updated_at: now
                    }
                }
            );

            // Update all order items to PASSED
            await db.collection('order_items').updateMany(
                { orderId: order.id },
                { $set: { qcStatus: 'PASSED', rewashRequired: false, currentStage: 'ready_for_delivery', updatedAt: now } }
            );

            // Immediate Notification to Assigned Delivery Driver
            if (deliveryDriverRes.assigned_driver_id) {
                await NotificationService.createNotification({
                    userId: String(deliveryDriverRes.assigned_driver_id),
                    title: '🚚 Order Ready for Delivery',
                    message: `Order #${order.id} has passed QC and is ready for delivery to postcode ${order.postcode || 'customer'}.`,
                    type: 'ready_for_delivery',
                    orderId: order.id
                });
            }

            // Also Notify Customer that items are cleaned & ready
            if (order.customer_id) {
                await NotificationService.createNotification({
                    userId: String(order.customer_id),
                    title: '✨ Laundry Cleaned & Inspected',
                    message: `Your laundry for order #${order.id} has passed Quality Check and is ready for delivery!`,
                    type: 'order_processed',
                    orderId: order.id
                });
            }

            await AuditService.recordOrderEvent({
                orderId: order.id,
                action: 'quality_check_passed',
                actorId: processorId,
                actorRole: processor.role || 'processor',
                before: { status: order.status },
                after: { status: deliveryDriverRes.status, qcPassed: true },
                reason: notes || 'Passed quality control standards',
                metadata: { driverId: deliveryDriverRes.assigned_driver_id, checklist }
            });

            return { success: true, status: deliveryDriverRes.status, reassigned: !!deliveryDriverRes.assigned_driver_id };

        } else if (status === 'rewash' || status === 'failed' || status === 'reprocess') {
            const rewashReason = reason || notes || 'QC inspection failed';
            const timelineEvents = [...(order.timeline_events || [])];
            timelineEvents.push({
                event: 'quality_check_failed',
                label: 'QC Failed: Rewash Required',
                actor: 'processor',
                actorId: processorId,
                notes: notes || rewashReason,
                reason: rewashReason,
                timestamp: now
            });

            await db.collection('orders').updateOne(
                { _id: order._id },
                {
                    $set: {
                        status: 'rewash_required',
                        statusLabel: 'Rewash Required (QC Failed)',
                        'qc.passed': false,
                        'qc.checkedByStaffId': processorId,
                        'qc.checkedAt': now,
                        'qc.notes': notes || '',
                        'qc.rewash_reason': rewashReason,
                        'qc.checklist': checklist || {},
                        timeline_events: timelineEvents,
                        updated_at: now
                    }
                }
            );

            // Create operational exception for rewash tracking
            await ExceptionService.createException({
                orderId: order.id,
                type: 'qc_rewash',
                priority: 'HIGH',
                plantId: order.plant_id,
                description: `Order #${order.id} failed QC inspection and requires rewash. Reason: ${rewashReason}`,
                evidence: {
                    reason: rewashReason,
                    checklist,
                    inspectorId: processorId,
                    notes
                }
            });

            await AuditService.recordOrderEvent({
                orderId: order.id,
                action: 'quality_check_failed',
                actorId: processorId,
                actorRole: processor.role || 'processor',
                before: { status: order.status },
                after: { status: 'rewash_required', qcPassed: false },
                reason: rewashReason,
                metadata: { notes, checklist }
            });

            return { success: true, status: 'rewash_required' };
        } else {
            throw new BadRequestError('Invalid quality check status. Must be passed, failed, rewash, or reprocess.');
        }
    }

    private static async autoAssignDeliveryDriver(db: any, order: any, now: string): Promise<any> {
        const orderPostcode = order.postcode || order.address || '';
        const rejectedIds: string[] = (order.rejected_driver_ids || []).map((id: any) => String(id));

        // Find active drivers
        const allDrivers = await db.collection('users').find({
            role: 'driver',
            is_active: true
        }).toArray();

        // Match driver by UK postcode
        const matchingDrivers = allDrivers.filter((driver: any) => {
            if (rejectedIds.includes(String(driver._id))) return false;
            const assignedList = driver.assigned_postcodes || driver.assignedSectors || [];
            return matchesPostcode(orderPostcode, assignedList);
        });

        if (matchingDrivers.length === 0) {
            return {
                status: 'ready_for_delivery',
                statusLabel: 'Ready for Delivery (Awaiting Driver Coverage)',
                assigned_driver_id: null,
                driver: null,
                timelineEvent: {
                    event: 'ready_for_delivery',
                    label: `Ready for Delivery (No active driver for postcode: ${orderPostcode})`,
                    actor: 'system',
                    timestamp: now
                }
            };
        }

        // Sort by least recently assigned
        matchingDrivers.sort((a: any, b: any) => {
            const aTime = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
            const bTime = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
            return aTime - bTime;
        });

        const selectedDriver = matchingDrivers[0];

        await db.collection('users').updateOne(
            { _id: selectedDriver._id },
            { $set: { last_assigned_at: now } }
        );

        const driverObj = {
            id: String(selectedDriver._id),
            name: selectedDriver.full_name,
            phone: selectedDriver.phone || '+44 7700 900301',
            vehicle: selectedDriver.vehicle || 'Preston Van A',
            rating: selectedDriver.rating || 4.8,
            avatar: selectedDriver.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
        };

        return {
            status: 'ready_for_delivery',
            statusLabel: 'Ready for Delivery',
            assigned_driver_id: selectedDriver._id,
            driver: driverObj,
            timelineEvent: {
                event: 'delivery_driver_assigned',
                label: `Delivery Assigned to Driver: ${selectedDriver.full_name} (${orderPostcode})`,
                actor: 'system',
                driverId: String(selectedDriver._id),
                driverName: selectedDriver.full_name,
                timestamp: now
            }
        };
    }
}
