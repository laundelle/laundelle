import { getDb } from '@/lib/mongodb';
import crypto from 'crypto';
import { IncidentRecord, IncidentType, IncidentPriority, IncidentStatus } from '@laundelle/types';
import { NotificationService } from './NotificationService';
import { assertCanResolveDispute } from '@/lib/permissions';
import { AuditService } from './AuditService';
import { generateIncidentId, buildEntityLookupQuery } from '@laundelle/ids';

export class IncidentService {
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

    static async createIncident(managerId: string, data: Partial<IncidentRecord>) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        const managerName = manager?.full_name || manager?.name || 'Plant Manager';

        if (!data.title || !data.description || !data.type) {
            throw new Error('Incident title, description, and type are strictly required.');
        }

        let orderData: any = null;
        if (data.orderId) {
            orderData = await db.collection('orders').findOne({ id: data.orderId });
        }

        const canonicalIncidentId = generateIncidentId();
        const incidentNumber = canonicalIncidentId;

        const newIncident: IncidentRecord = {
            id: canonicalIncidentId,
            publicId: canonicalIncidentId,
            incidentNumber,
            plant_id: plantId,
            orderId: data.orderId || undefined,
            customerId: data.customerId || orderData?.customer_id || orderData?.userId || undefined,
            customerName: data.customerName || orderData?.customer?.name || orderData?.customerName || undefined,
            customerPhone: data.customerPhone || orderData?.phone || orderData?.customer_phone || undefined,
            driverId: data.driverId || orderData?.assigned_driver_id || undefined,
            driverName: data.driverName || orderData?.driver?.name || orderData?.assigned_driver_name || undefined,
            reportedByRole: (data.reportedByRole || 'manager') as any,
            reportedById: managerId,
            reportedByName: managerName,
            type: (data.type || 'customer_complaint') as IncidentType,
            priority: (data.priority || 'medium') as IncidentPriority,
            status: 'reported',
            title: data.title.trim(),
            description: data.description.trim(),
            itemDetails: data.itemDetails || undefined,
            investigationNotes: [
                {
                    actorId: managerId,
                    actorName: managerName,
                    actorRole: 'manager',
                    note: `Incident officially registered with priority: ${(data.priority || 'medium').toUpperCase()}. Initial report: ${data.description.trim()}`,
                    timestamp: now
                }
            ],
            createdAt: now,
            updatedAt: now
        };

        await db.collection('incidents').insertOne(newIncident as any);

        // If order linked, push incident timeline event
        if (orderData) {
            const timelineEvent = {
                event: 'incident_reported',
                label: `Incident Logged (${newIncident.type.replace(/_/g, ' ').toUpperCase()}) - #${incidentNumber}`,
                actor: 'manager',
                actorId: managerId,
                actorName: managerName,
                incidentId: newIncident.id,
                incidentNumber,
                title: newIncident.title,
                authorizedBy: 'Plant Manager',
                timestamp: now
            };

            await db.collection('orders').updateOne(
                { id: data.orderId },
                {
                    $push: { timeline_events: timelineEvent },
                    $set: { has_active_incident: true, updated_at: now }
                } as any
            );
        }

        // Write to audit log
        if (data.orderId) {
            await AuditService.recordOrderEvent({
                orderId: data.orderId,
                action: 'incident_created',
                actorId: managerId,
                actorRole: 'manager',
                reason: newIncident.description,
                metadata: { incidentId: newIncident.id, incidentNumber, type: newIncident.type, priority: newIncident.priority }
            });
        } else {
            await AuditService.recordEvent({
                entityType: 'incident',
                entityId: newIncident.id,
                action: 'incident_created',
                actorId: managerId,
                actorRole: 'manager',
                reason: newIncident.description,
                metadata: { incidentNumber, type: newIncident.type, priority: newIncident.priority }
            });
        }

        return { success: true, incident: newIncident };
    }

    static async getIncidents(managerId: string, filters?: { status?: string; type?: string; priority?: string; orderId?: string }) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        const query: any = { plant_id: plantId };

        if (filters?.status && filters.status !== 'all') {
            query.status = filters.status;
        }
        if (filters?.type && filters.type !== 'all') {
            query.type = filters.type;
        }
        if (filters?.priority && filters.priority !== 'all') {
            query.priority = filters.priority;
        }
        if (filters?.orderId) {
            query.orderId = filters.orderId;
        }

        const incidents = await db.collection('incidents')
            .find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();

        return { success: true, incidents };
    }

    static async getIncidentById(managerId: string, incidentId: string) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);

        const incident = await db.collection('incidents').findOne(
            buildEntityLookupQuery(incidentId, 'incident') as any
        );

        if (!incident) throw new Error('Incident report not found.');
        if (incident.plant_id && incident.plant_id !== plantId) {
            throw new Error('Access denied: Incident belongs to another facility.');
        }

        return { success: true, incident };
    }

    static async addInvestigationNote(managerId: string, incidentId: string, note: string) {
        const db = await getDb();
        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        if (!note || !note.trim()) {
            throw new Error('Investigation note cannot be empty.');
        }

        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        const managerName = manager?.full_name || manager?.name || 'Plant Manager';

        const incident = await db.collection('incidents').findOne(
            buildEntityLookupQuery(incidentId, 'incident') as any
        );

        if (!incident) throw new Error('Incident not found.');
        if (incident.plant_id && incident.plant_id !== plantId) {
            throw new Error('Access denied: Incident belongs to another facility.');
        }

        const noteObj = {
            actorId: managerId,
            actorName: managerName,
            actorRole: 'manager',
            note: note.trim(),
            timestamp: now
        };

        const updateSet: any = {
            updatedAt: now
        };
        if (incident.status === 'reported') {
            updateSet.status = 'investigating';
        }

        await db.collection('incidents').updateOne(
            { _id: incident._id } as any,
            {
                $push: { investigationNotes: noteObj },
                $set: updateSet
            } as any
        );

        // Audit Log
        await AuditService.recordEvent({
            entityType: 'incident',
            entityId: incident.publicId || incident.id || incident._id,
            action: 'incident_note_added',
            actorId: managerId,
            actorRole: 'manager',
            reason: note.trim()
        });

        return { success: true, message: 'Investigation note added successfully.' };
    }

    static async resolveIncident(
        managerId: string,
        incidentId: string,
        resolution: {
            type: 'refund' | 'credit' | 'rewash' | 'replacement' | 'dismissed' | 'manual';
            amount?: number;
            creditVoucherCode?: string;
            explanation: string;
        },
        callerRole?: string
    ) {
        const db = await getDb();
        const manager = await db.collection('users').findOne({ _id: managerId } as any);
        const managerName = manager?.full_name || manager?.name || 'Plant Manager';
        const effectiveRole = (callerRole || manager?.role || 'manager').toLowerCase().trim();

        // Enforce financial resolution restrictions (Refund, Credit, Replacement are Admin-only)
        assertCanResolveDispute(effectiveRole, resolution.type);

        const plantId = await this.getManagerPlantId(managerId);
        const now = new Date().toISOString();

        if (!resolution.explanation || !resolution.explanation.trim()) {
            throw new Error('A detailed resolution explanation is strictly mandatory.');
        }

        const incident = await db.collection('incidents').findOne(
            buildEntityLookupQuery(incidentId, 'incident') as any
        );

        if (!incident) throw new Error('Incident not found.');
        if (effectiveRole === 'manager' && plantId && incident.plant_id && incident.plant_id !== plantId) {
            throw new Error('Access denied: Incident belongs to another facility.');
        }

        const targetStatus: IncidentStatus = `resolved_${resolution.type}` as IncidentStatus;

        const resolutionPayload = {
            type: resolution.type,
            amount: resolution.amount ? Number(resolution.amount) : undefined,
            creditVoucherCode: resolution.creditVoucherCode?.trim() || undefined,
            explanation: resolution.explanation.trim(),
            resolvedBy: managerId,
            resolvedByName: managerName,
            resolvedAt: now
        };

        const closingNote = {
            actorId: managerId,
            actorName: managerName,
            actorRole: effectiveRole,
            note: `Incident officially resolved (${resolution.type.toUpperCase()}). Justification: ${resolution.explanation.trim()}${
                resolution.amount ? ` • Value: £${resolution.amount}` : ''
            }`,
            timestamp: now
        };

        await db.collection('incidents').updateOne(
            { _id: incident._id } as any,
            {
                $set: {
                    status: targetStatus,
                    resolution: resolutionPayload,
                    updatedAt: now
                },
                $push: { investigationNotes: closingNote }
            } as any
        );

        // If order linked, update order status or push timeline event
        if (incident.orderId) {
            const order = await db.collection('orders').findOne({ id: incident.orderId });
            if (order) {
                const orderUpdates: any = { updated_at: now, has_active_incident: false };
                const timelineEventsPush: any[] = [];

                if (resolution.type === 'rewash') {
                    orderUpdates.status = 'washing';
                    orderUpdates.statusLabel = 'Rewashing Cycle (Dispute Resolution)';
                    timelineEventsPush.push({
                        event: 'manager_resolution_rewash',
                        label: `Free Rewash Cycle Triggered (Incident #${incident.incidentNumber})`,
                        actor: 'manager',
                        actorId: managerId,
                        actorName: managerName,
                        notes: resolution.explanation,
                        authorizedBy: 'Plant Manager',
                        timestamp: now
                    });
                } else {
                    timelineEventsPush.push({
                        event: 'incident_resolved',
                        label: `Incident #${incident.incidentNumber} Resolved (${resolution.type.toUpperCase()})`,
                        actor: 'manager',
                        actorId: managerId,
                        actorName: managerName,
                        resolution: resolutionPayload,
                        authorizedBy: 'Plant Manager',
                        timestamp: now
                    });
                }

                await db.collection('orders').updateOne(
                    { id: incident.orderId },
                    {
                        $set: orderUpdates,
                        $push: { timeline_events: { $each: timelineEventsPush } }
                    } as any
                );

                // Notify customer
                const targetUser = incident.customerId || order.customer_id || order.userId;
                if (targetUser) {
                    await NotificationService.createNotification({
                        userId: targetUser,
                        title: `🛡️ Update on Incident #${incident.incidentNumber}`,
                        message: `Your reported dispute regarding Order #${incident.orderId} has been resolved (${resolution.type.toUpperCase()}). Explanation: ${resolution.explanation}`,
                        type: 'system',
                        orderId: incident.orderId
                    }).catch(() => {});
                }
            }
        }

        // Record Audit Log
        if (incident.orderId) {
            await AuditService.recordOrderEvent({
                orderId: incident.orderId,
                action: 'incident_resolved',
                actorId: managerId,
                actorRole: effectiveRole,
                reason: resolution.explanation,
                metadata: { incidentId: incident.id, incidentNumber: incident.incidentNumber, resolution: resolutionPayload }
            });
        } else {
            await AuditService.recordEvent({
                entityType: 'incident',
                entityId: incident.id || incident._id,
                action: 'incident_resolved',
                actorId: managerId,
                actorRole: effectiveRole,
                reason: resolution.explanation,
                metadata: { incidentNumber: incident.incidentNumber, resolution: resolutionPayload }
            });
        }

        return {
            success: true,
            status: targetStatus,
            resolution: resolutionPayload,
            message: `Incident resolved successfully via ${resolution.type}.`
        };
    }
}
