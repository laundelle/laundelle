import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';
import { hashPassword } from '@/lib/auth';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { generateStaffId } from '@laundelle/ids';
import { assertCanPerformOverride } from '@/lib/permissions';
import {
    generateSecureNumericPin,
    generatePinSalt,
    hashOrderPin,
    encryptOrderPin
} from '@/lib/orderPin';
import { BadRequestError } from '@/lib/api';

export class ManagerService {
    private static async getManagerPlantId(managerId: string) {
        const db = await getDb();
        const user = await db.collection('users').findOne({
            _id: managerId,
            role: { $in: ['manager', 'admin', 'super_admin'] },
            is_active: { $ne: false }
        } as any);
        if (!user) {
            throw new Error('Access denied: User is inactive or does not exist.');
        }
        if (user.role === 'admin' || user.role === 'super_admin') {
            return user.plant_id || null;
        }
        let plantId = user.plant_id;
        if (!plantId) {
            const plant = await db.collection('plants').findOne({ manager_id: managerId } as any);
            if (plant) {
                plantId = plant._id;
                await db.collection('users').updateOne({ _id: managerId } as any, { $set: { plant_id: plantId } });
            }
        }
        if (!plantId) {
            throw new Error('Access denied: Manager has no assigned plant.');
        }
        return plantId;
    }

    static async getDashboardMetrics(managerId: string) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        
        const plant = await db.collection('plants').findOne({ _id: plantId } as any);
        if (!plant) throw new Error('Plant not found.');
        
        const manager = await db.collection('users').findOne({ _id: managerId } as any);

        const orders = await db.collection('orders').find({
            $or: [
                { plant_id: plantId },
                { manager_id: managerId }
            ],
            status: { $ne: 'pending_payment' }
        }).toArray();
        const activeOrders = orders.filter((o: any) => !['delivered', 'cancelled'].includes(o.status));
        const staff = await db.collection('users').find({
            $or: [
                { plant_id: plantId },
                { manager_id: managerId }
            ],
            is_active: true,
            role: { $in: ['driver', 'processor'] }
        }).toArray();

        // Status counts
        let todayOrders = 0;
        let pendingPickup = 0;
        let atPlant = 0;
        let processing = 0;
        let readyForDelivery = 0;
        let outForDelivery = 0;
        let completed = 0;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        orders.forEach((o: any) => {
            const orderDate = new Date(o.createdAt);
            if (orderDate >= startOfToday) {
                todayOrders++;
            }

            if (o.status === 'collection_scheduled' || o.status === 'collection_pending' || o.status === 'waiting_for_driver') {
                pendingPickup++;
            } else if (o.status === 'received_at_facility' || o.status === 'intake_completed') {
                atPlant++;
            } else if (['washing', 'drying', 'folding_steaming', 'ready_for_qc'].includes(o.status)) {
                processing++;
            } else if (o.status === 'ready_for_delivery') {
                readyForDelivery++;
            } else if (o.status === 'out_for_delivery') {
                outForDelivery++;
            } else if (o.status === 'delivered') {
                completed++;
            }
        });

        let totalDrivers = 0;
        let availableDrivers = 0;
        let busyDrivers = 0;
        let offlineDrivers = 0;

        let totalProcessors = 0;
        let availableProcessors = 0;
        let processingProcessors = 0;
        let offlineProcessors = 0;

        staff.forEach((s: any) => {
            if (s.role === 'driver') {
                totalDrivers++;
                if (s.status === 'available' || s.availability === 'available') availableDrivers++;
                else if (s.status === 'busy' || s.availability === 'busy') busyDrivers++;
                else offlineDrivers++;
            } else if (s.role === 'processor') {
                totalProcessors++;
                if (s.status === 'available' || s.availability === 'available') availableProcessors++;
                else if (s.status === 'processing' || s.availability === 'processing') processingProcessors++;
                else offlineProcessors++;
            }
        });

        return {
            plantId: plant._id,
            plantName: plant.name,
            plantCode: plant.code,
            managerName: manager?.full_name,
            managerStatus: manager?.is_active ? 'Active' : 'Suspended',
            stats: {
                todayOrders,
                activeOrders: activeOrders.length,
                pendingPickup,
                pendingIntake: atPlant,
                atPlant,
                processing,
                inProcessing: processing,
                readyForDelivery,
                readyDelivery: readyForDelivery,
                outForDelivery,
                completed
            },
            staff: {
                list: staff.map((s: any) => ({
                    id: s._id,
                    name: s.full_name,
                    role: s.role,
                    availability: s.availability || s.status
                })),
                drivers: {
                    total: totalDrivers,
                    available: availableDrivers,
                    busy: busyDrivers,
                    offline: offlineDrivers
                },
                processors: {
                    total: totalProcessors,
                    available: availableProcessors,
                    processing: processingProcessors,
                    offline: offlineProcessors
                }
            }
        };
    }

    static async getOrders(managerId: string, limit: number, page: number, status?: string) {
        const db = await getDb();
        let plantId = await this.getManagerPlantId(managerId);
        if (!plantId) {
            const defaultPlant = await db.collection('plants').findOne({});
            if (defaultPlant) {
                plantId = defaultPlant._id;
            }
        }

        const plant = plantId ? await db.collection('plants').findOne({ _id: plantId } as any) : null;
        const servicePincodes: string[] = plant?.service_pincodes || [];

        const plantOrConditions: any[] = [];
        if (plantId) {
            plantOrConditions.push({ plant_id: plantId });
        }

        // Also match any unassigned orders within the plant's service pincodes
        if (servicePincodes.length > 0) {
            const pincodeRegexes = servicePincodes.map((pc: string) => new RegExp(`^${pc}`, 'i'));
            plantOrConditions.push({
                $and: [
                    {
                        $or: [
                            { plant_id: null },
                            { plant_id: { $exists: false } },
                            { plant_id: '' }
                        ]
                    },
                    {
                        $or: [
                            { postcode: { $in: pincodeRegexes } },
                            ...servicePincodes.map((pc: string) => ({ address: new RegExp(`\\b${pc}\\b`, 'i') }))
                        ]
                    }
                ]
            });
        }

        const query: any = {
            $and: [
                plantOrConditions.length > 0 ? { $or: plantOrConditions } : {},
                { status: { $ne: 'pending_payment' } }
            ].filter(cond => Object.keys(cond).length > 0)
        };

        if (status && status !== 'all') {
            query.$and.push({ status });
        }

        const orders = await db.collection('orders')
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();
        const total = await db.collection('orders').countDocuments(query);

        // Fetch driver metadata if any order has assigned_driver_id but missing driver object
        const missingDriverIds = Array.from(new Set(
            orders
                .filter((o: any) => o.assigned_driver_id && !o.driver)
                .map((o: any) => o.assigned_driver_id)
        ));

        let driverMap = new Map<string, any>();
        if (missingDriverIds.length > 0) {
            const drivers = await db.collection('users')
                .find({ _id: { $in: missingDriverIds } })
                .toArray();
            driverMap = new Map(drivers.map((d: any) => [d._id, d]));
        }

        // Normalize fields for UI compatibility
        orders.forEach((o: any) => {
            if (o.address && typeof o.address === 'object') {
                const parts = [o.address.line1, o.address.line2, o.address.city, o.address.postcode].filter(Boolean);
                o.address = parts.join(', ');
            } else if (!o.address) {
                o.address = o.postcode || 'N/A';
            }
            if (o.total !== undefined && o.total !== null) {
                o.total = Number(o.total) || 0;
            } else {
                o.total = 0;
            }
            if (!o.statusLabel && o.status) {
                o.statusLabel = o.status
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (l: string) => l.toUpperCase());
            }
            if (!o.paymentStatus) {
                o.paymentStatus = o.payment_status || 'Paid';
            }
            if (!o.driver && o.assigned_driver_id && driverMap.has(o.assigned_driver_id)) {
                const d = driverMap.get(o.assigned_driver_id);
                o.driver = {
                    id: d._id,
                    name: d.full_name,
                    phone: d.phone,
                    vehicle: d.vehicle || 'Logistics Van'
                };
            }
        });

        return { orders, total };
    }

    static async assignDriver(managerId: string, orderId: string, driverId?: string | null) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        const order = await db.collection('orders').findOne({ id: orderId });
        if (!order) throw new Error('Order not found.');
        if (order.plant_id && order.plant_id !== plantId) {
            throw new Error('Access denied: Order belongs to a different plant.');
        }

        // Handle Unassign Driver
        if (!driverId) {
            const revertStatus = ['ready_for_delivery', 'out_for_delivery'].includes(order.status)
                ? 'ready_for_delivery'
                : 'waiting_for_driver';
            const revertLabel = revertStatus === 'ready_for_delivery' ? 'Ready for Delivery' : 'Waiting for Driver';

            await db.collection('orders').updateOne(
                { id: orderId },
                {
                    $set: {
                        assigned_driver_id: null,
                        driver: null,
                        status: revertStatus,
                        statusLabel: revertLabel,
                        updated_at: now
                    },
                    $push: {
                        timeline_events: {
                            event: 'driver_unassigned',
                            label: 'Driver Unassigned by Manager',
                            actor: 'manager',
                            actorId: managerId,
                            timestamp: now
                        }
                    } as any
                }
            );
            return { success: true, message: 'Driver unassigned successfully.' };
        }

        const driver = await db.collection('users').findOne({ _id: driverId, role: 'driver', is_active: true } as any);
        if (!driver) throw new Error('Valid, active driver in your plant not found.');

        // Preserve delivery vs collection status
        let newStatus = 'collection_scheduled';
        let newStatusLabel = 'Collection Scheduled';
        if (['ready_for_delivery', 'out_for_delivery'].includes(order.status)) {
            newStatus = 'out_for_delivery';
            newStatusLabel = 'Out for Delivery';
        }

        await db.collection('orders').updateOne(
            { id: orderId },
            {
                $set: { 
                    assigned_driver_id: driverId, 
                    plant_id: plantId,
                    driver: {
                        id: driver._id,
                        name: driver.full_name,
                        phone: driver.phone,
                        vehicle: driver.vehicle || 'Logistics Van'
                    },
                    status: newStatus, 
                    statusLabel: newStatusLabel, 
                    updated_at: now 
                },
                $push: {
                    timeline_events: {
                        event: 'driver_assigned',
                        label: `Assigned to Driver ${driver.full_name}`,
                        actor: 'manager',
                        actorId: managerId,
                        driverId,
                        timestamp: now
                    }
                } as any
            }
        );
        return { success: true };
    }

    static async assignProcessor(managerId: string, orderId: string, processorId?: string | null) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        const order = await db.collection('orders').findOne({ id: orderId });
        if (!order) throw new Error('Order not found.');
        if (order.plant_id && order.plant_id !== plantId) {
            throw new Error('Access denied: Order belongs to a different plant.');
        }

        // Handle Unassign Processor
        if (!processorId) {
            await db.collection('orders').updateOne(
                { id: orderId },
                {
                    $set: {
                        assigned_processor_id: null,
                        updated_at: now
                    },
                    $push: {
                        timeline_events: {
                            event: 'processor_unassigned',
                            label: 'Processor Unassigned by Manager',
                            actor: 'manager',
                            actorId: managerId,
                            timestamp: now
                        }
                    } as any
                }
            );
            return { success: true, message: 'Processor unassigned successfully.' };
        }

        const processor = await db.collection('users').findOne({ _id: processorId, role: 'processor', is_active: true } as any);
        if (!processor) throw new Error('Valid, active processor in your plant not found.');

        // Keep current status if already in progress, else set to received_at_facility
        const processingStages = ['washing', 'drying', 'folding_steaming', 'ready_for_qc', 'ready_for_delivery'];
        const updateFields: any = {
            assigned_processor_id: processorId,
            plant_id: plantId,
            updated_at: now
        };
        if (!processingStages.includes(order.status)) {
            updateFields.status = 'received_at_facility';
            updateFields.statusLabel = 'Received at Facility';
        }

        await db.collection('orders').updateOne(
            { id: orderId },
            {
                $set: updateFields,
                $push: {
                    timeline_events: {
                        event: 'processor_assigned',
                        label: `Assigned to Processor ${processor.full_name}`,
                        actor: 'manager',
                        actorId: managerId,
                        processorId,
                        timestamp: now
                    }
                } as any
            }
        );
        return { success: true };
    }

    static async reassignBatchOrders(managerId: string, orderIds: string[], targetId: string | null, type: 'driver' | 'processor') {
        const results = [];
        for (const orderId of orderIds) {
            try {
                if (type === 'driver') {
                    await this.assignDriver(managerId, orderId, targetId);
                } else {
                    await this.assignProcessor(managerId, orderId, targetId);
                }
                results.push({ orderId, success: true });
            } catch (err: any) {
                results.push({ orderId, success: false, error: err.message });
            }
        }
        return { success: true, results };
    }

    static async managerDirectOrderOverride(
        managerId: string,
        orderId: string,
        action: any,
        data?: any,
        callerRole?: string
    ) {
        return await this.managerExecuteOverride(managerId, orderId, action, data, callerRole);
    }

    static async managerExecuteOverride(
        managerId: string,
        orderId: string,
        action: string,
        data?: any,
        callerRole?: string
    ) {
        const db = await getDb();
        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        const managerName = manager?.full_name || manager?.name || 'Plant Manager';
        const effectiveRole = (callerRole || manager?.role || 'manager').toLowerCase().trim();

        // Enforce strict Role-Based Access Control
        assertCanPerformOverride(effectiveRole, action);

        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        const order = await db.collection('orders').findOne({ id: orderId });
        if (!order) throw new Error('Order not found.');

        const isOrderCompleted = order.status === 'delivered' || order.status === 'completed' || Boolean(order.is_delivered);
        if (isOrderCompleted) {
            throw new BadRequestError('Cannot execute override: This order is already completed and delivered.');
        }

        if (effectiveRole === 'manager' && plantId && order.plant_id && order.plant_id !== plantId) {
            throw new Error('Access denied: Order belongs to a different plant.');
        }

        const reason = (data?.reason || data?.notes || '').trim();
        const requiresReasonActions = [
            'force_pickup_otp',
            'force_delivery_pin',
            'rollback_pickup',
            'rollback_delivery',
            'put_on_hold',
            'cancel_order',
            'mark_customer_unavailable',
            'return_to_plant'
        ];
        if (requiresReasonActions.includes(action) && !reason) {
            throw new Error(`A valid reason is strictly mandatory for manager override: ${action}`);
        }

        let updateSet: any = { updated_at: now };
        let unsetSet: any = {};
        let timelineEvent: any = null;
        let auditActionName = action;

        // 1. ORDER CONTROL
        if (action === 'rollback_pickup') {
            const hasDriver = Boolean(order.assigned_driver_id);
            const targetStatus = hasDriver ? 'collection_scheduled' : 'waiting_for_driver';
            const targetLabel = hasDriver ? 'Collection Scheduled' : 'Waiting for Driver';

            updateSet.status = targetStatus;
            updateSet.statusLabel = targetLabel;
            unsetSet.actual_weight = '';
            unsetSet.pickup_pin_verified_at = '';
            unsetSet.is_collected = '';
            if (order.qr_tracking) {
                updateSet['qr_tracking.collectedAt'] = null;
            }

            timelineEvent = {
                event: 'manager_rollback_pickup',
                label: 'Pickup Reverted to Awaiting Collection by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        } else if (action === 'rollback_delivery') {
            const hasDriver = Boolean(order.assigned_driver_id);
            const targetStatus = hasDriver ? 'out_for_delivery' : 'ready_for_delivery';
            const targetLabel = hasDriver ? 'Out for Delivery' : 'Ready for Delivery';

            updateSet.status = targetStatus;
            updateSet.statusLabel = targetLabel;
            unsetSet.deliveredAt = '';
            unsetSet.delivered_at = '';
            unsetSet.is_delivered = '';
            unsetSet.delivery_pin_verified_at = '';

            timelineEvent = {
                event: 'manager_rollback_delivery',
                label: 'Delivery Reverted to Out for Delivery by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        } else if (action === 'cancel_order') {
            updateSet.status = 'cancelled';
            updateSet.statusLabel = 'Cancelled';
            updateSet.cancel_reason = reason;

            timelineEvent = {
                event: 'manager_cancel_override',
                label: `Order Cancelled by Manager: ${reason}`,
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                timestamp: now
            };
        } else if (action === 'reopen_order') {
            const targetStatus = order.assigned_driver_id ? 'collection_scheduled' : 'waiting_for_driver';
            updateSet.status = targetStatus;
            updateSet.statusLabel = targetStatus === 'collection_scheduled' ? 'Collection Scheduled' : 'Waiting for Driver';

            timelineEvent = {
                event: 'manager_reopen_override',
                label: 'Order Reopened & Returned to Active Queue by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason: reason || 'Manager reopened operational workflow',
                timestamp: now
            };
        } else if (action === 'reschedule_slot') {
            if (data?.pickupDate) updateSet.pickupDate = data.pickupDate;
            if (data?.pickupSlot) {
                updateSet.pickupSlot = data.pickupSlot;
                updateSet.pickup_slot = data.pickupSlot;
            }
            if (data?.deliveryDate) updateSet.deliveryDate = data.deliveryDate;
            if (data?.deliverySlot) {
                updateSet.deliverySlot = data.deliverySlot;
                updateSet.delivery_slot = data.deliverySlot;
            }

            timelineEvent = {
                event: 'manager_reschedule_slot',
                label: 'Pickup/Delivery Time Window Rescheduled by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                details: {
                    pickupDate: updateSet.pickupDate || order.pickupDate,
                    pickupSlot: updateSet.pickupSlot || order.pickupSlot,
                    deliveryDate: updateSet.deliveryDate || order.deliveryDate,
                    deliverySlot: updateSet.deliverySlot || order.deliverySlot
                },
                reason: reason || 'Customer requested alternative schedule window',
                timestamp: now
            };
        } else if (action === 'edit_order_details') {
            if (data?.address) updateSet.address = data.address.trim();
            if (data?.addressLine1) updateSet.addressLine1 = data.addressLine1.trim();
            if (data?.addressLine2) updateSet.addressLine2 = data.addressLine2.trim();
            if (data?.postcode) updateSet.postcode = data.postcode.trim().toUpperCase();
            if (data?.phone) {
                updateSet.phone = data.phone.trim();
                updateSet.customer_phone = data.phone.trim();
            }
            if (data?.specialInstructions !== undefined) {
                updateSet.specialInstructions = data.specialInstructions;
            }

            timelineEvent = {
                event: 'manager_edit_order_details',
                label: 'Delivery Address & Contact Details Updated by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                notes: reason || 'Address/Contact updated per customer request',
                timestamp: now
            };
        } else if (action === 'edit_order_items') {
            if (Array.isArray(data?.items)) {
                updateSet.items = data.items;
                updateSet.bagCount = data.bagCount || data.items.length;
                updateSet.itemCount = data.items.reduce((s: number, i: any) => s + (Number(i.quantity) || 1), 0);
            }

            timelineEvent = {
                event: 'manager_edit_items',
                label: `Order Items & Bags Updated by Manager (${updateSet.itemCount || order.itemCount} items)`,
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                notes: reason || 'Garment inventory adjusted',
                timestamp: now
            };
        }

        // 2. PICKUP CONTROL
        else if (action === 'force_pickup_otp' || action === 'confirm_pickup') {
            updateSet.status = 'received_at_facility';
            updateSet.statusLabel = 'Received at Facility';
            updateSet.actual_weight = data?.actualWeightKg || order.actual_weight || 5;
            updateSet.pickup_pin_verified_at = now;
            updateSet.pickup_verified_by_override = true;
            updateSet.override_reason = reason;

            timelineEvent = {
                event: 'manager_forced_pickup_override',
                label: 'Pickup Confirmed by Manager Override (Manual OTP Bypass)',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        } else if (action === 'mark_customer_unavailable') {
            updateSet.status = 'collection_pending';
            updateSet.statusLabel = 'Customer Unavailable • Reschedule Required';
            updateSet.customer_unavailable_at = now;
            updateSet.customer_unavailable_notes = reason;

            timelineEvent = {
                event: 'manager_customer_unavailable',
                label: 'Customer Unavailable at Scheduled Time (Flagged by Manager)',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                timestamp: now
            };
        } else if (action === 'resend_pickup_otp' || action === 'generate_new_otp') {
            const newPin = generateSecureNumericPin(6);
            const pickupPinSalt = generatePinSalt();
            const customerId = String(order.customer_id || order.customerId || order.userId || '');
            const pickupPinHash = hashOrderPin(newPin, pickupPinSalt, order.id, customerId);
            const pickupPinEnc = encryptOrderPin(newPin, order.id, customerId);

            updateSet.pickup_pin = newPin;
            updateSet.pickup_otp = newPin;
            updateSet.otp_code = newPin;
            updateSet.pickup_pin_salt = pickupPinSalt;
            updateSet.pickup_pin_hash = pickupPinHash;
            updateSet.pickup_pin_enc = pickupPinEnc;
            updateSet.pickup_pin_attempts = 0;
            updateSet.pickup_otp_attempts = 0;
            updateSet.pickup_pin_locked = false;
            updateSet.pickup_pin_expires_at = null;
            updateSet.pickup_pin_generated_at = now;
            unsetSet.pickup_pin_verified_at = '';
            unsetSet.pickup_otp_verified_at = '';

            timelineEvent = {
                event: 'manager_regenerated_otp',
                label: 'Fresh Pickup OTP Generated & Sent to Customer App',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                timestamp: now
            };

            const notifTarget = order.customer_id || order.userId || order.customer?.id;
            if (notifTarget) {
                await NotificationService.createNotification({
                    userId: String(notifTarget),
                    title: '🔑 New Pickup PIN Generated',
                    message: `Your driver collection PIN is ${newPin}. Please share this with the driver upon arrival.`,
                    type: 'pickup_otp',
                    orderId: order.id
                }).catch(() => {});
            }
        }

        // 3. DELIVERY CONTROL
        else if (action === 'resend_delivery_otp' || action === 'generate_new_delivery_otp') {
            const newPin = generateSecureNumericPin(4);
            const deliveryPinSalt = generatePinSalt();
            const customerId = String(order.customer_id || order.customerId || order.userId || '');
            const deliveryPinHash = hashOrderPin(newPin, deliveryPinSalt, order.id, customerId);
            const deliveryPinEnc = encryptOrderPin(newPin, order.id, customerId);

            updateSet.delivery_pin = newPin;
            updateSet.delivery_otp = newPin;
            updateSet.delivery_pin_salt = deliveryPinSalt;
            updateSet.delivery_pin_hash = deliveryPinHash;
            updateSet.delivery_pin_enc = deliveryPinEnc;
            updateSet.delivery_pin_attempts = 0;
            updateSet.delivery_otp_attempts = 0;
            updateSet.delivery_pin_locked = false;
            updateSet.delivery_pin_expires_at = null;
            updateSet.delivery_pin_generated_at = now;
            unsetSet.delivery_pin_verified_at = '';
            unsetSet.delivery_otp_verified_at = '';

            timelineEvent = {
                event: 'manager_regenerated_delivery_otp',
                label: 'Fresh Delivery PIN Generated & Sent to Customer App',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                timestamp: now
            };

            const notifTarget = order.customer_id || order.userId || order.customer?.id;
            if (notifTarget) {
                await NotificationService.createNotification({
                    userId: String(notifTarget),
                    title: '🔑 New Delivery PIN Generated',
                    message: `Your doorstep delivery verification PIN is ${newPin}. Please share this 4-digit PIN with the driver upon handover.`,
                    type: 'delivery_otp',
                    orderId: order.id
                }).catch(() => {});
            }
        }
        else if (action === 'force_delivery_pin' || action === 'confirm_delivery') {
            updateSet.status = 'delivered';
            updateSet.statusLabel = 'Delivered';
            updateSet.deliveredAt = now;
            updateSet.delivered_at = now;
            updateSet.is_delivered = true;
            updateSet.delivery_pin_verified_at = now;
            updateSet.delivery_verified_by_override = true;

            timelineEvent = {
                event: 'manager_forced_delivery_override',
                label: 'Delivery Confirmed by Manager Override (Manual PIN Bypass)',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        } else if (action === 'return_to_plant') {
            updateSet.status = 'ready_for_delivery';
            updateSet.statusLabel = 'Returned to Plant (Safe Storage)';
            updateSet.returned_to_plant_at = now;
            updateSet.assigned_driver_id = null;
            updateSet.driver = null;

            timelineEvent = {
                event: 'manager_return_to_plant',
                label: 'Order Returned to Plant Storage (Delivery Aborted)',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        } else if (action === 'put_on_hold') {
            updateSet.status = 'on_hold';
            updateSet.statusLabel = 'On Hold (Manager Review)';
            updateSet.on_hold_at = now;
            updateSet.hold_reason = reason;

            timelineEvent = {
                event: 'manager_put_on_hold',
                label: `Order Placed on Hold: ${reason}`,
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };
        }

        // 4. WORKFLOW STAGES (PRESERVED)
        else if (action === 'advance_stage') {
            const nextStage = data?.nextStage;
            const validStages: Record<string, string> = {
                washing: 'Washing Cycle',
                drying: 'Drying Cycle',
                folding_steaming: 'Folding & Steaming',
                ready_for_qc: 'Quality Inspection Ready',
                ready_for_delivery: 'Ready for Delivery'
            };
            if (!nextStage || !validStages[nextStage]) {
                throw new Error(`Invalid processing stage: ${nextStage}`);
            }
            updateSet.status = nextStage;
            updateSet.statusLabel = validStages[nextStage];
            timelineEvent = {
                event: 'manager_stage_advance_override',
                label: `Advanced to ${validStages[nextStage]} by Manager`,
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                stage: nextStage,
                timestamp: now
            };
        } else if (action === 'flag_rewash') {
            updateSet.status = 'washing';
            updateSet.statusLabel = 'Rewashing Cycle';
            timelineEvent = {
                event: 'manager_rewash_override',
                label: 'Rewash Cycle Triggered by Manager',
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                reason: reason || 'Quality standard not met',
                timestamp: now
            };
        } else if (action === 'unassign_driver') {
            return await this.assignDriver(managerId, orderId, null);
        } else if (action === 'unassign_processor') {
            return await this.assignProcessor(managerId, orderId, null);
        } else {
            throw new Error(`Unsupported override action: ${action}`);
        }

        const mongoUpdate: any = { $set: updateSet };
        if (Object.keys(unsetSet).length > 0) {
            mongoUpdate.$unset = unsetSet;
        }
        if (timelineEvent) {
            mongoUpdate.$push = { timeline_events: timelineEvent };
        }

        await db.collection('orders').updateOne({ id: orderId }, mongoUpdate);

        // Record tamper-evident audit log
        // Record tamper-evident audit log
        await AuditService.recordOrderEvent({
            orderId,
            action: `order_override_${auditActionName}`,
            actorId: managerId,
            actorRole: effectiveRole,
            before: {
                status: order.status,
                statusLabel: order.statusLabel,
                assigned_driver_id: order.assigned_driver_id,
                pickupSlot: order.pickupSlot,
                deliverySlot: order.deliverySlot,
                address: order.address
            },
            after: updateSet,
            reason: reason || 'Manager operational override'
        });

        return {
            success: true,
            status: updateSet.status || order.status,
            statusLabel: updateSet.statusLabel || order.statusLabel,
            message: `Action ${action} completed successfully.`
        };
    }

    static async reassignAllDriverOrders(managerId: string, sourceDriverId: string, targetDriverId: string | null) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        const managerName = manager?.full_name || manager?.name || 'Plant Manager';

        const sourceDriver = await db.collection('users').findOne({ _id: sourceDriverId, role: 'driver' } as any);
        if (!sourceDriver) throw new Error('Source driver not found.');

        let targetDriver: any = null;
        if (targetDriverId) {
            targetDriver = await db.collection('users').findOne({ _id: targetDriverId, role: 'driver', is_active: true } as any);
            if (!targetDriver) throw new Error('Target driver not found or is inactive.');
        }

        const activeOrders = await db.collection('orders').find({
            plant_id: plantId,
            assigned_driver_id: sourceDriverId,
            status: { $nin: ['delivered', 'cancelled'] }
        }).toArray();

        if (activeOrders.length === 0) {
            return { success: true, count: 0, message: 'No active orders to reassign for this driver.' };
        }

        const orderIds = activeOrders.map((o: any) => o.id);
        const results = [];

        for (const order of activeOrders) {
            try {
                if (targetDriver) {
                    await this.assignDriver(managerId, order.id, targetDriverId);
                } else {
                    await this.assignDriver(managerId, order.id, null);
                }
                results.push({ orderId: order.id, success: true });
            } catch (err: any) {
                results.push({ orderId: order.id, success: false, error: err.message });
            }
        }

        // Audit Log for bulk transfer
        await AuditService.recordEvent({
            entityType: 'driver',
            entityId: sourceDriverId,
            action: 'manager_bulk_reassign_all_orders',
            actorId: managerId,
            actorRole: 'manager',
            reason: `Reassigned ${activeOrders.length} orders from driver ${sourceDriver.full_name}`,
            metadata: {
                sourceDriverId,
                sourceDriverName: sourceDriver.full_name,
                targetDriverId: targetDriverId || null,
                targetDriverName: targetDriver ? targetDriver.full_name : 'Unassigned Pool',
                orderCount: activeOrders.length,
                orderIds
            }
        });

        return {
            success: true,
            count: activeOrders.length,
            targetDriverName: targetDriver ? targetDriver.full_name : 'Unassigned Pool',
            results
        };
    }

    static async getOrderAuditLogs(managerId: string, orderId: string) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        const order = await db.collection('orders').findOne({ id: orderId });
        if (!order) throw new Error('Order not found.');
        if (order.plant_id && order.plant_id !== plantId) {
            throw new Error('Access denied: Order belongs to a different plant.');
        }

        const logsResult = await AuditService.getLogs({ entityId: orderId }, 100, 1);
        return { logs: logsResult.items };
    }

    static async getStaff(managerId: string) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        const query = {
            $or: [
                { plant_id: plantId },
                { manager_id: managerId }
            ],
            role: { $in: ['driver', 'processor'] }
        };
        const staff = await db.collection('users')
            .find(query, { projection: { password: 0 } })
            .sort({ created_at: -1 })
            .toArray();
        return { staff };
    }

    // ─── Helper: Sync all driver/processor postcodes from manager's plant ───────
    static async syncAllStaffPostcodes(managerId: string): Promise<void> {
        const db = await getDb();
        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        if (!manager) return;

        let plant: any = null;
        if (manager.plant_id) {
            plant = await db.collection('plants').findOne({ _id: manager.plant_id } as any);
        }
        if (!plant) {
            plant = await db.collection('plants').findOne({ manager_id: managerId } as any);
        }
        if (!plant) return;

        const pincodes: string[] = Array.isArray(plant.service_pincodes)
            ? plant.service_pincodes
            : (plant.service_pincodes || '').split(',').map((p: string) => p.trim().toUpperCase()).filter(Boolean);

        await db.collection('users').updateMany(
            {
                $or: [{ manager_id: managerId }, { plant_id: plant._id }],
                role: { $in: ['driver', 'processor'] }
            },
            { $set: { assigned_postcodes: pincodes, assignedSectors: pincodes } }
        );
    }

    static async createStaffMember(managerId: string, staffData: any) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        if (!staffData?.email || !staffData?.password) {
            throw new Error('Email and password required.');
        }

        if (!['driver', 'processor'].includes(staffData.role)) {
            throw new Error('Plant Managers can only create Drivers or Processors.');
        }

        const existing = await db.collection('users').findOne({ email: staffData.email.toLowerCase() });
        if (existing) throw new Error('Email already in use.');

        // Resolve postcodes from manager's plant
        const plant = await db.collection('plants').findOne({ _id: plantId } as any);
        const plantPostcodes: string[] = plant
            ? (Array.isArray(plant.service_pincodes)
                ? plant.service_pincodes
                : (plant.service_pincodes || '').split(',').map((p: string) => p.trim().toUpperCase()).filter(Boolean))
            : [];

        const internalDbId = new ObjectId().toHexString();
        const canonicalStaffId = generateStaffId();
        const now = new Date().toISOString();
        
        const newStaff: any = {
            ...staffData,
            _id: internalDbId,
            id: canonicalStaffId,
            publicId: canonicalStaffId,
            staffId: canonicalStaffId,
            email: staffData.email.toLowerCase(),
            password: hashPassword(staffData.password),
            role: staffData.role, // 'driver' or 'processor'
            plant_id: plantId, // Force to manager's plant
            manager_id: managerId,
            // Postcodes always inherited from plant — never from request body
            assigned_postcodes: plantPostcodes,
            assignedSectors: plantPostcodes,
            is_active: staffData.is_active !== undefined ? staffData.is_active : true,
            vehicle_type: staffData.vehicle_type || staffData.vehicleType || '',
            vehicle_reg: staffData.vehicle_reg || staffData.vehicleReg || '',
            license_number: staffData.license_number || staffData.licenseNum || '',
            emergency_contact: staffData.emergency_contact || (staffData.emergencyName || staffData.emergencyPhone ? { name: staffData.emergencyName || '', phone: staffData.emergencyPhone || '' } : undefined),
            vehicle: staffData.vehicle || (staffData.vehicle_reg || staffData.vehicleReg ? `${staffData.vehicle_type || staffData.vehicleType || 'Vehicle'} - ${staffData.vehicle_reg || staffData.vehicleReg}` : staffData.vehicle || ''),
            created_at: now,
            created_by: managerId
        };
        await db.collection('users').insertOne(newStaff as any);

        return { success: true, staffId: canonicalStaffId, publicId: canonicalStaffId };
    }

    static async updateStaffMember(managerId: string, staffId: string, staffData: any) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        const user = await db.collection('users').findOne({ _id: staffId } as any);
        if (!user) throw new Error('Staff member not found.');

        // Enforce strict manager separation: must belong to manager's plant or be assigned to this manager
        const isAssignedToThisManager = (user.plant_id && user.plant_id === plantId) || (user.manager_id && user.manager_id === managerId);
        if (!isAssignedToThisManager || !['driver', 'processor'].includes(user.role)) {
            throw new Error('Access denied: You can only edit staff members assigned to your facility.');
        }

        if (staffData.role && staffData.role !== user.role) {
            throw new Error('Access denied: Managers cannot change a staff member\'s role.');
        }

        if (staffData.is_active === false && user.role === 'driver') {
            const activeOrders = await db.collection('orders').countDocuments({
                assigned_driver_id: staffId,
                status: { $nin: ['delivered', 'cancelled', 'order_placed', 'pending_payment'] }
            });
            if (activeOrders > 0) {
                throw new Error(`Cannot suspend driver with ${activeOrders} active assigned order(s). Please reassign their orders first.`);
            }
        }

        const now = new Date().toISOString();
        const updateFields: any = { updated_at: now };

        // Whitelist fields a manager can update for their assigned staff
        if (staffData.full_name) updateFields.full_name = staffData.full_name;
        if (staffData.phone) updateFields.phone = staffData.phone;
        if (staffData.email) updateFields.email = staffData.email.toLowerCase();
        if (staffData.is_active !== undefined) updateFields.is_active = Boolean(staffData.is_active);
        if (staffData.password && staffData.password.trim().length > 0) updateFields.password = hashPassword(staffData.password);
        if (staffData.vehicle !== undefined) updateFields.vehicle = staffData.vehicle;
        if (staffData.vehicle_type !== undefined || staffData.vehicleType !== undefined) updateFields.vehicle_type = staffData.vehicle_type || staffData.vehicleType;
        if (staffData.vehicle_reg !== undefined || staffData.vehicleReg !== undefined) updateFields.vehicle_reg = staffData.vehicle_reg || staffData.vehicleReg;
        if (staffData.license_number !== undefined || staffData.licenseNum !== undefined) updateFields.license_number = staffData.license_number || staffData.licenseNum;
        if (staffData.emergency_contact !== undefined) updateFields.emergency_contact = staffData.emergency_contact;
        if (staffData.emergencyName !== undefined || staffData.emergencyPhone !== undefined) {
            updateFields.emergency_contact = { name: staffData.emergencyName || '', phone: staffData.emergencyPhone || '' };
        }
        if (staffData.availability !== undefined) {
            updateFields.availability = staffData.availability;
            updateFields.status = staffData.availability;
        }
        // NOTE: assigned_postcodes are intentionally excluded — they are always inherited
        // from the manager's plant (service_pincodes). Use syncAllStaffPostcodes() to refresh.

        await db.collection('users').updateOne({ _id: staffId } as any, { $set: updateFields });
        
        await AuditService.recordEvent({
            entityType: 'staff',
            entityId: staffId,
            action: 'staff_updated_by_manager',
            actorId: managerId,
            actorRole: 'manager'
        });
        return { success: true };
    }
}
