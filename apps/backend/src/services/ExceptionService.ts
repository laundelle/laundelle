import { getDb } from '@/lib/mongodb';
import { OperationalException, OperationalExceptionPriority, OperationalExceptionStatus, OperationalExceptionType } from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { generateExceptionId } from '@laundelle/ids';

export class ExceptionService {
  /**
   * Registers a new operational exception in the central queue.
   */
  static async createException(data: {
    orderId: string;
    orderNumber?: string;
    type: OperationalExceptionType;
    priority?: OperationalExceptionPriority;
    plantId?: string;
    description: string;
    evidence?: any;
    assignedTo?: string;
    assignedToName?: string;
  }): Promise<OperationalException> {
    if (!data.orderId || !data.type || !data.description) {
      throw new BadRequestError('Missing required exception parameters: orderId, type, description.');
    }

    const db = await getDb();
    const now = new Date().toISOString();
    const exceptionId = generateExceptionId();

    const newException: OperationalException = {
      id: exceptionId,
      publicId: exceptionId,
      orderId: data.orderId,
      orderNumber: data.orderNumber || data.orderId,
      type: data.type,
      priority: data.priority || 'medium',
      status: 'OPEN',
      createdAt: now,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      plantId: data.plantId,
      description: data.description.trim(),
      evidence: data.evidence || undefined,
      updatedAt: now
    };

    await db.collection('exceptions').insertOne(newException as any);

    // Audit log entry
    await AuditService.recordOrderEvent({
      orderId: data.orderId,
      action: 'operational_exception_raised',
      actorId: 'system',
      actorRole: 'system',
      reason: data.description,
      metadata: { exceptionId, type: data.type, priority: newException.priority }
    });

    return newException;
  }

  /**
   * Fetches operational exceptions filtered by plant, status, and priority.
   */
  static async getExceptions(filter: {
    plantId?: string;
    status?: OperationalExceptionStatus | string;
    priority?: OperationalExceptionPriority | string;
    type?: OperationalExceptionType | string;
    page?: number;
    limit?: number;
  } = {}, limit = 50, page = 1) {
    const db = await getDb();
    const query: any = {};

    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.status && filter.status !== 'ALL') query.status = filter.status;
    if (filter.priority && filter.priority !== 'ALL') query.priority = filter.priority;
    if (filter.type && filter.type !== 'ALL') query.type = filter.type;

    const effectiveLimit = filter.limit || limit;
    const effectivePage = filter.page || page;
    const skip = (Math.max(1, effectivePage) - 1) * effectiveLimit;

    const [items, total] = await Promise.all([
      db.collection('exceptions')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(effectiveLimit)
        .toArray(),
      db.collection('exceptions').countDocuments(query)
    ]);

    return {
      items: items as unknown as OperationalException[],
      pagination: {
        page: effectivePage,
        limit: effectiveLimit,
        total,
        totalPages: Math.ceil(total / effectiveLimit)
      }
    };
  }

  /**
   * Resolves an operational exception with notes and resolution action.
   */
  static async resolveException(
    exceptionId: string,
    actorId: string,
    actorName: string,
    action: string,
    notes: string
  ): Promise<OperationalException> {
    if (!action || !notes) {
      throw new BadRequestError('Resolution action and explanation notes are required.');
    }

    const db = await getDb();
    const existing = await db.collection('exceptions').findOne({ id: exceptionId });
    if (!existing) throw new NotFoundError('Operational exception not found.');

    const now = new Date().toISOString();
    const resolution = {
      action: action.trim(),
      notes: notes.trim(),
      resolvedBy: actorId,
      resolvedByName: actorName,
      resolvedAt: now
    };

    await db.collection('exceptions').updateOne(
      { $or: [{ publicId: exceptionId }, { id: exceptionId }] } as any,
      {
        $set: {
          status: 'RESOLVED',
          resolution,
          updatedAt: now
        }
      }
    );

    // Audit log
    await AuditService.recordOrderEvent({
      orderId: existing.orderId,
      action: 'operational_exception_resolved',
      actorId,
      actorRole: 'staff',
      reason: notes,
      metadata: { exceptionId, action }
    });

    return {
      ...(existing as unknown as OperationalException),
      status: 'RESOLVED',
      resolution,
      updatedAt: now
    };
  }

  /**
   * Metrics count for dashboard.
   */
  static async getSummaryCounts(plantId?: string) {
    const db = await getDb();
    const baseQuery: any = plantId ? { plantId } : {};

    const [openCount, urgentCount, resolvedTodayCount] = await Promise.all([
      db.collection('exceptions').countDocuments({ ...baseQuery, status: 'OPEN' }),
      db.collection('exceptions').countDocuments({ ...baseQuery, status: 'OPEN', priority: 'urgent' }),
      db.collection('exceptions').countDocuments({
        ...baseQuery,
        status: 'RESOLVED',
        'resolution.resolvedAt': { $gte: new Date().toISOString().split('T')[0] }
      })
    ]);

    return {
      openCount,
      urgentCount,
      resolvedTodayCount
    };
  }

  static async getExceptionSummary(plantId?: string) {
    return this.getSummaryCounts(plantId);
  }
}
