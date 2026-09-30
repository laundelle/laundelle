import { getDb } from '@/lib/mongodb';
import { UnifiedAlert } from '@laundelle/types';
import crypto from 'crypto';
import { generateAlertId } from '@laundelle/ids';

export class AlertService {
  /**
   * Creates or updates a unified alert with deduplication.
   * If an unresolved alert already exists for the same entityId and type, it updates it rather than spamming.
   */
  static async createAlert(params: {
    plantId?: string;
    type: UnifiedAlert['type'];
    severity: UnifiedAlert['severity'];
    title: string;
    message: string;
    entityId?: string;
    entityType?: string;
  }): Promise<UnifiedAlert> {
    const db = await getDb();
    const collection = db.collection('unified_alerts');

    if (params.entityId) {
      const existing = await collection.findOne({
        entityId: params.entityId,
        type: params.type,
        resolved: false
      });

      if (existing) {
        await collection.updateOne(
          { id: existing.id },
          {
            $set: {
              severity: params.severity,
              title: params.title,
              message: params.message,
              updatedAt: new Date().toISOString()
            }
          }
        );
        return { ...(existing as unknown as UnifiedAlert), severity: params.severity, title: params.title, message: params.message };
      }
    }

    const alertId = generateAlertId();
    const alert: UnifiedAlert = {
      id: alertId,
      publicId: alertId,
      plantId: params.plantId,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      entityId: params.entityId,
      entityType: params.entityType,
      createdAt: new Date().toISOString(),
      resolved: false
    };

    await collection.insertOne(alert);
    return alert;
  }

  /**
   * Resolves an alert.
   */
  static async resolveAlert(id: string, resolvedBy: string = 'system'): Promise<boolean> {
    const db = await getDb();
    const result = await db.collection('unified_alerts').updateOne(
      { $or: [{ publicId: id }, { id }], resolved: false } as any,
      {
        $set: {
          resolved: true,
          resolvedAt: new Date().toISOString(),
          resolvedBy
        }
      }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Resolves alerts matching an entityId and type (e.g. when vehicle doc renewed or stock replenished).
   */
  static async resolveByEntityAndType(entityId: string, type: UnifiedAlert['type'], resolvedBy: string = 'system'): Promise<number> {
    const db = await getDb();
    const result = await db.collection('unified_alerts').updateMany(
      { entityId, type, resolved: false },
      {
        $set: {
          resolved: true,
          resolvedAt: new Date().toISOString(),
          resolvedBy
        }
      }
    );
    return result.modifiedCount;
  }

  /**
   * Lists alerts with optional filters.
   */
  static async listAlerts(filter: {
    plantId?: string;
    resolved?: boolean;
    severity?: UnifiedAlert['severity'];
    type?: UnifiedAlert['type'];
    limit?: number;
  } = {}): Promise<UnifiedAlert[]> {
    const db = await getDb();
    const query: any = {};

    if (filter.plantId) query.plantId = filter.plantId;
    if (filter.resolved !== undefined) query.resolved = filter.resolved;
    if (filter.severity) query.severity = filter.severity;
    if (filter.type) query.type = filter.type;

    const limit = filter.limit || 100;
    const alerts = await db.collection('unified_alerts')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return alerts as unknown as UnifiedAlert[];
  }

  /**
   * Gets unresolved alert count.
   */
  static async getUnresolvedCount(plantId?: string): Promise<number> {
    const db = await getDb();
    const query: any = { resolved: false };
    if (plantId) query.plantId = plantId;
    return await db.collection('unified_alerts').countDocuments(query);
  }
}
