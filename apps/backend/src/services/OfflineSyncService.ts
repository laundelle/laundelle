import { getDb } from '@/lib/mongodb';
import {
  RegisteredDevice,
  OfflineOperation,
  OfflineSyncRequest,
  OfflineSyncResponse,
  OfflinePinVoucher
} from '@laundelle/types';
import { AlertService } from './AlertService';
import { AuditService } from './AuditService';
import crypto from 'crypto';

const VOUCHER_SECRET = process.env.OFFLINE_VOUCHER_SECRET || 'laundelle_production_offline_voucher_secret_2026';

export class OfflineSyncService {
  /**
   * Registers or refreshes a client device for offline synchronization.
   */
  static async registerDevice(params: {
    deviceId: string;
    userId: string;
    userRole: string;
    appVersion: string;
    platform?: 'ANDROID' | 'IOS' | 'WEB_PWA';
    fcmToken?: string;
  }): Promise<RegisteredDevice> {
    const db = await getDb();
    const now = new Date().toISOString();

    const device: RegisteredDevice = {
      deviceId: params.deviceId,
      userId: params.userId,
      userRole: params.userRole,
      appVersion: params.appVersion,
      platform: params.platform || 'WEB_PWA',
      lastSyncAt: now,
      status: 'ACTIVE',
      fcmToken: params.fcmToken
    };

    await db.collection('registered_devices').updateOne(
      { deviceId: params.deviceId },
      { $set: device },
      { upsert: true }
    );

    return device;
  }

  /**
   * Generates a tamper-proof cryptographic offline PIN voucher for safe mobile storage.
   * NEVER stores plaintext customer PINs on the mobile device.
   */
  static generateOfflinePinVoucher(params: {
    orderId: string;
    deviceId: string;
    plainPin: string;
    validityHours?: number;
  }): OfflinePinVoucher {
    const hours = params.validityHours || 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const salt = crypto.randomBytes(16).toString('hex');

    const pinHash = crypto
      .createHmac('sha256', VOUCHER_SECRET)
      .update(`${params.orderId}:${params.deviceId}:${params.plainPin.trim()}:${salt}`)
      .digest('hex');

    return {
      orderId: params.orderId,
      deviceId: params.deviceId,
      pinHash,
      expiresAt,
      salt
    };
  }

  /**
   * Verifies an entered PIN against an offline voucher without internet connectivity.
   */
  static verifyOfflinePinVoucher(voucher: OfflinePinVoucher, enteredPin: string): boolean {
    if (new Date(voucher.expiresAt).getTime() < Date.now()) {
      return false; // Expired voucher
    }

    const expectedHash = crypto
      .createHmac('sha256', VOUCHER_SECRET)
      .update(`${voucher.orderId}:${voucher.deviceId}:${enteredPin.trim()}:${voucher.salt}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(voucher.pinHash, 'hex'), Buffer.from(expectedHash, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Processes a batch of offline actions idempotently with conflict resolution.
   */
  static async processSyncBatch(request: OfflineSyncRequest): Promise<OfflineSyncResponse> {
    const db = await getDb();
    const now = new Date().toISOString();

    const appliedOperations: string[] = [];
    const conflicts: OfflineSyncResponse['conflicts'] = [];
    const rejectedOperations: OfflineSyncResponse['rejectedOperations'] = [];

    // Update device lastSyncAt
    await db.collection('registered_devices').updateOne(
      { deviceId: request.deviceId },
      { $set: { lastSyncAt: now } }
    );

    for (const op of request.operations) {
      try {
        // 1. Check idempotency: if operation already applied, skip
        const existingOp = await db.collection('offline_sync_queue').findOne({ operationId: op.operationId });
        if (existingOp && existingOp.syncStatus === 'APPLIED') {
          appliedOperations.push(op.operationId);
          continue;
        }

        // 2. Conflict & business rule evaluation based on action
        if (op.action === 'COLLECT_ORDER') {
          const order = await db.collection('orders').findOne({ id: op.entityId });
          if (!order) {
            rejectedOperations.push({ operationId: op.operationId, reason: `Order ${op.entityId} not found.` });
            continue;
          }

          // Check if already collected or delivered
          const terminalOrAdvancedStatuses = ['DELIVERED', 'COMPLETED', 'CANCELLED'];
          if (terminalOrAdvancedStatuses.includes((order.status || '').toUpperCase())) {
            const conflict = {
              operationId: op.operationId,
              reason: `Order ${op.entityId} is already ${order.status}`,
              entityId: op.entityId,
              serverState: { status: order.status, updatedAt: order.updatedAt }
            };
            conflicts.push(conflict);

            await db.collection('offline_sync_queue').updateOne(
              { operationId: op.operationId },
              { $set: { ...op, syncStatus: 'CONFLICT', failureReason: conflict.reason, conflictDetails: conflict } },
              { upsert: true }
            );

            await AlertService.createAlert({
              plantId: order.plant_id,
              type: 'OFFLINE_CONFLICT',
              severity: 'WARNING',
              title: `Offline Sync Conflict: Order ${order.id}`,
              message: `Driver attempted offline collection for order ${order.id}, but server status is ${order.status}.`,
              entityId: order.id,
              entityType: 'ORDER'
            });
            continue;
          }

          // Apply collection
          await db.collection('orders').updateOne(
            { id: op.entityId },
            {
              $set: {
                status: 'PICKED_UP',
                pickupDate: op.payload.collectedAt || now,
                actual_weight_kg: op.payload.weightKg || order.actual_weight_kg,
                bag_count: op.payload.bagCount || order.bag_count,
                updatedAt: now
              },
              $push: {
                timeline_events: {
                  status: 'PICKED_UP',
                  timestamp: op.payload.collectedAt || op.clientTimestamp,
                  note: 'Collected via offline mobile sync',
                  performedBy: op.userId
                }
              } as any
            }
          );

          await AuditService.recordOrderEvent({
            orderId: op.entityId,
            action: 'offline_pickup_synced',
            actorId: op.userId,
            actorRole: 'driver',
            before: { status: order.status },
            after: { status: 'PICKED_UP' },
            reason: 'Collected via offline mobile app sync',
            metadata: { weightKg: op.payload.weightKg, bagCount: op.payload.bagCount, clientTimestamp: op.clientTimestamp }
          });
        } else if (op.action === 'DELIVER_ORDER') {
          const order = await db.collection('orders').findOne({ id: op.entityId });
          if (!order) {
            rejectedOperations.push({ operationId: op.operationId, reason: `Order ${op.entityId} not found.` });
            continue;
          }

          if ((order.status || '').toUpperCase() === 'DELIVERED') {
            // Already delivered idempotently
            appliedOperations.push(op.operationId);
            continue;
          }

          // Apply delivery
          await db.collection('orders').updateOne(
            { id: op.entityId },
            {
              $set: {
                status: 'DELIVERED',
                completedAt: op.payload.deliveredAt || now,
                podNotes: op.payload.notes,
                updatedAt: now
              },
              $push: {
                timeline_events: {
                  status: 'DELIVERED',
                  timestamp: op.payload.deliveredAt || op.clientTimestamp,
                  note: 'Delivered via offline mobile sync',
                  performedBy: op.userId
                }
              } as any
            }
          );

          await AuditService.recordOrderEvent({
            orderId: op.entityId,
            action: 'offline_delivery_synced',
            actorId: op.userId,
            actorRole: 'driver',
            before: { status: order.status },
            after: { status: 'DELIVERED' },
            reason: 'Delivered via offline mobile app sync',
            metadata: { podNotes: op.payload.notes, clientTimestamp: op.clientTimestamp }
          });
        } else if (op.action === 'PROCESS_STAGE') {
          // Processor offline stage update
          const order = await db.collection('orders').findOne({ id: op.entityId });
          if (order) {
            await db.collection('orders').updateOne(
              { id: op.entityId },
              {
                $set: {
                  processingStage: op.payload.stage,
                  updatedAt: now
                },
                $push: {
                  timeline_events: {
                    status: `STAGE_${(op.payload.stage || '').toUpperCase()}`,
                    timestamp: op.clientTimestamp,
                    performedBy: op.userId
                  }
                } as any
              }
            );

            await AuditService.recordOrderEvent({
              orderId: op.entityId,
              action: 'offline_processing_stage_synced',
              actorId: op.userId,
              actorRole: 'processor',
              before: { processingStage: order.processingStage },
              after: { processingStage: op.payload.stage },
              reason: 'Processing stage updated via offline mobile app sync',
              metadata: { stage: op.payload.stage, clientTimestamp: op.clientTimestamp }
            });
          }
        } else if (op.action === 'QC_INSPECT') {
          await db.collection('order_items').updateOne(
            { id: op.entityId },
            {
              $set: {
                qcStatus: op.payload.qcStatus,
                qcNotes: op.payload.qcNotes,
                qcDefectReason: op.payload.defectReason,
                qcInspectedAt: now,
                qcInspectorId: op.userId
              }
            }
          );
        }

        // Operation applied cleanly
        await db.collection('offline_sync_queue').updateOne(
          { operationId: op.operationId },
          {
            $set: {
              ...op,
              syncStatus: 'APPLIED',
              appliedAt: now
            }
          },
          { upsert: true }
        );

        appliedOperations.push(op.operationId);

        await AuditService.recordEvent({
          actorId: op.userId,
          actorRole: op.role,
          action: `OFFLINE_SYNC_${op.action}`,
          entityType: 'OFFLINE_OPERATION',
          entityId: op.operationId,
          metadata: { deviceId: op.deviceId, entityId: op.entityId }
        });
      } catch (err: any) {
        rejectedOperations.push({ operationId: op.operationId, reason: err.message });
      }
    }

    return {
      success: true,
      appliedOperations,
      conflicts,
      rejectedOperations,
      serverTimestamp: now
    };
  }

  /**
   * Retrieves count of pending or conflicted sync operations.
   */
  static async getBacklogCount(): Promise<number> {
    const db = await getDb();
    return await db.collection('offline_sync_queue').countDocuments({
      syncStatus: { $in: ['PENDING', 'CONFLICT'] }
    });
  }
}
