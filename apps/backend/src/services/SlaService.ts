import { getDb } from '@/lib/mongodb';
import { OrderSla, SlaStatus } from '@laundelle/types';
import { NotificationService } from './NotificationService';
import { AuditService } from '@/services/AuditService';
import { generateExceptionId } from '@laundelle/ids';

export class SlaService {
  /**
   * Warning threshold in minutes before deadline (Default: 4 hours = 240 mins)
   */
  static readonly DEFAULT_WARNING_MINUTES = 240;

  /**
   * Calculates current SLA metrics for an order.
   */
  static calculateOrderSla(order: any, warningThresholdMinutes = SlaService.DEFAULT_WARNING_MINUTES): OrderSla {
    const isExpress = order.customisation?.expressSpeed === 'Express 24h' || 
                      order.items?.some((i: any) => i.name?.toLowerCase().includes('express') || i.serviceId?.includes('express'));
    const turnaroundType: 'standard_48h' | 'express_24h' = isExpress ? 'express_24h' : 'standard_48h';
    const turnaroundHours = isExpress ? 24 : 48;

    // Determine baseline start timestamp (pickedUpAt > receivedAtFacilityAt > pickupDate > createdAt)
    let baselineTime: Date;
    if (order.pickedUpAt) {
      baselineTime = new Date(order.pickedUpAt);
    } else if (order.pickupDate) {
      // Parse pickup slot if available (e.g. "08:00 - 10:00" -> use 10:00 end of slot)
      const slotEndMatch = (order.pickupSlot || '').match(/- (\d{1,2}):(\d{2})/);
      if (slotEndMatch) {
        baselineTime = new Date(`${order.pickupDate}T${slotEndMatch[1].padStart(2, '0')}:${slotEndMatch[2]}:00Z`);
      } else {
        baselineTime = new Date(`${order.pickupDate}T12:00:00Z`);
      }
    } else {
      baselineTime = new Date(order.createdAt || Date.now());
    }

    if (isNaN(baselineTime.getTime())) {
      baselineTime = new Date(order.createdAt || Date.now());
    }

    // Calculate deadline
    const deadline = new Date(baselineTime.getTime() + turnaroundHours * 60 * 60 * 1000);
    const deadlineAt = deadline.toISOString();

    const warning = new Date(deadline.getTime() - warningThresholdMinutes * 60 * 1000);
    const warningAt = warning.toISOString();

    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const timeRemainingMinutes = Math.round(diffMs / (60 * 1000));

    const isDelivered = ['delivered', 'completed'].includes(order.status);
    const deliveredAtTime = order.delivered_at ? new Date(order.delivered_at) : null;

    let status: SlaStatus = 'ON_TIME';

    if (isDelivered) {
      if (deliveredAtTime && deliveredAtTime.getTime() <= deadline.getTime()) {
        status = 'COMPLETED_ON_TIME';
      } else {
        status = 'COMPLETED_LATE';
      }
    } else {
      if (diffMs < 0) {
        status = 'BREACHED';
      } else if (timeRemainingMinutes <= warningThresholdMinutes) {
        status = 'AT_RISK';
      } else {
        status = 'ON_TIME';
      }
    }

    return {
      status,
      turnaroundType,
      deadlineAt,
      warningAt,
      timeRemainingMinutes,
      isAtRisk: status === 'AT_RISK',
      isBreached: status === 'BREACHED',
      breachedAt: status === 'BREACHED' ? (order.sla?.breachedAt || now.toISOString()) : undefined,
      breachReason: order.sla?.breachReason,
      responsibleStage: order.status,
      calculatedAt: now.toISOString()
    };
  }

  /**
   * Recalculates and updates an order's SLA status in the database.
   * Escalates with notifications and exceptions if newly AT_RISK or BREACHED.
   */
  static async checkAndEscalateSla(orderId: string) {
    const db = await getDb();
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) return null;

    const previousSla = order.sla;
    const currentSla = this.calculateOrderSla(order);

    const now = new Date().toISOString();

    await db.collection('orders').updateOne(
      { id: orderId },
      {
        $set: {
          sla: currentSla,
          updated_at: now
        }
      }
    );

    // Escalation: Newly AT_RISK
    if (currentSla.isAtRisk && (!previousSla || !previousSla.isAtRisk)) {
      if (order.plant_id) {
        const plant = await db.collection('plants').findOne({ _id: order.plant_id } as any);
        if (plant?.manager_id) {
          await NotificationService.createNotification({
            userId: String(plant.manager_id),
            title: `⚠️ SLA At Risk: Order #${order.id}`,
            message: `Order #${order.id} has ${currentSla.timeRemainingMinutes}m remaining before turnaround breach (${currentSla.turnaroundType}). Current stage: ${order.statusLabel || order.status}.`,
            type: 'sla_at_risk',
            orderId: order.id,
            idempotencyKey: `sla_at_risk_${order.id}`
          });
        }
      }
    }

    // Escalation: Newly BREACHED
    if (currentSla.isBreached && (!previousSla || !previousSla.isBreached)) {
      // 1. Notify Plant Manager
      if (order.plant_id) {
        const plant = await db.collection('plants').findOne({ _id: order.plant_id } as any);
        if (plant?.manager_id) {
          await NotificationService.createNotification({
            userId: String(plant.manager_id),
            title: `🚨 SLA Breached: Order #${order.id}`,
            message: `Order #${order.id} has exceeded its turnaround commitment. Responsible stage: ${order.statusLabel || order.status}. Immediate escalation required.`,
            type: 'sla_breached',
            orderId: order.id,
            idempotencyKey: `sla_breached_${order.id}`
          });
        }
      }

      // 2. Insert into central operational exception queue
      const exceptionId = generateExceptionId();
      await db.collection('exceptions').updateOne(
        { orderId: order.id, type: 'SLA_breached' },
        {
          $setOnInsert: {
            id: exceptionId,
            publicId: exceptionId,
            orderId: order.id,
            orderNumber: order.id,
            type: 'SLA_breached',
            priority: 'urgent',
            status: 'OPEN',
            plantId: order.plant_id,
            description: `Order turnaround breach: exceeded ${currentSla.turnaroundType} commitment at stage '${order.status}'.`,
            evidence: {
              deadlineAt: currentSla.deadlineAt,
              responsibleStage: order.status,
              timeExceededMinutes: Math.abs(currentSla.timeRemainingMinutes)
            },
            createdAt: now,
            updatedAt: now
          }
        },
        { upsert: true }
      );

      // 3. Log audit event
      await AuditService.recordOrderEvent({
        orderId: order.id,
        action: 'sla_breached',
        actorId: 'system',
        actorRole: 'system',
        reason: `Exceeded ${currentSla.turnaroundType} commitment at stage '${order.status}'`,
        metadata: { deadlineAt: currentSla.deadlineAt, stage: order.status }
      });
    }

    return currentSla;
  }
}
