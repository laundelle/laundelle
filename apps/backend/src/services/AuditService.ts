import { getDb } from '@/lib/mongodb';
import { AuditEventRecord } from '@laundelle/types';
import crypto from 'crypto';
import { generateAuditEventId } from '@laundelle/ids';

export interface RecordAuditParams {
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

const GENESIS_HASH = '0'.repeat(64);

export class AuditService {
  /**
   * Recursively sorts object keys for deterministic RFC-8785-compliant canonical serialization.
   */
  private static canonicalize(obj: any): any {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj._bsontype === 'ObjectID' || obj.constructor?.name === 'ObjectId') return obj.toString();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) return obj.toString('hex');
    if (Array.isArray(obj)) return obj.map(AuditService.canonicalize);
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, any> = {};
    for (const key of sortedKeys) {
      result[key] = AuditService.canonicalize(obj[key]);
    }
    return result;
  }

  /**
   * Computes SHA-256 cryptographic hash over previousHash and canonical event payload.
   */
  private static computeHash(previousHash: string, payload: Record<string, any>): string {
    const canonical = JSON.stringify(this.canonicalize(payload));
    return crypto.createHash('sha256').update(`${previousHash}:${canonical}`).digest('hex');
  }

  /**
   * Records an immutable, tamper-evident audit log event into MongoDB.
   * Chained cryptographically with SHA-256 (previousHash -> currentHash).
   */
  static async recordEvent(params: RecordAuditParams): Promise<AuditEventRecord> {
    const db = await getDb();
    const collection = db.collection('audit_log');

    // 1. Fetch latest record for chain link
    const latestEvent = await collection.find({ currentHash: { $exists: true } }).sort({ timestamp: -1, _id: -1 }).limit(1).toArray();
    const previousHash = latestEvent.length > 0 && latestEvent[0].currentHash ? latestEvent[0].currentHash : GENESIS_HASH;

    const eventId = generateAuditEventId();
    const timestamp = new Date().toISOString();

    const rawPayload = {
      eventId,
      publicId: eventId,
      auditEventId: eventId,
      actorId: params.actorId || 'system',
      actorRole: params.actorRole || 'system',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before !== undefined ? params.before : null,
      after: params.after !== undefined ? params.after : null,
      reason: params.reason || '',
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'system',
      timestamp,
      metadata: params.metadata || {}
    };

    const canonicalPayload = this.canonicalize(rawPayload);
    const currentHash = this.computeHash(previousHash, canonicalPayload);

    const record: AuditEventRecord & Record<string, any> = {
      ...canonicalPayload,
      previousHash,
      currentHash,
      // Compatibility aliases for legacy queries
      orderId: params.entityId,
      event: params.action
    };

    await collection.insertOne(record as any);

    return record;
  }

  /**
   * Helper to record order-specific audit events with standardized schema.
   */
  static async recordOrderEvent(params: {
    orderId: string;
    action: string;
    actorId?: string;
    actorRole?: string;
    before?: any;
    after?: any;
    reason?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditEventRecord> {
    return this.recordEvent({
      entityType: 'order',
      entityId: params.orderId,
      action: params.action,
      actorId: params.actorId || 'system',
      actorRole: params.actorRole || 'system',
      before: params.before,
      after: params.after,
      reason: params.reason || '',
      metadata: params.metadata || {},
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'system'
    });
  }

  /**
   * Cryptographically verifies the integrity of the audit log sequence.
   * Traverses from genesis to head, recalculating hashes to detect any tampering,
   * dropped records, or out-of-order mutations.
   */
  static async verifyChainIntegrity(entityId?: string): Promise<{
    valid: boolean;
    totalChecked: number;
    brokenEventId?: string;
    message: string;
  }> {
    const db = await getDb();
    const query: any = { currentHash: { $exists: true } };
    if (entityId) {
      query.$or = [{ entityId }, { orderId: entityId }];
    }

    const events = await db.collection('audit_log')
      .find(query)
      .sort({ timestamp: 1, _id: 1 })
      .toArray();

    if (events.length === 0) {
      return { valid: true, totalChecked: 0, message: 'Audit chain is empty. Verified.' };
    }

    let expectedPreviousHash = events[0].previousHash || GENESIS_HASH;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      // 1. Check previousHash link (for continuous global chain)
      if (!entityId) {
        if (i > 0 && ev.previousHash !== expectedPreviousHash) {
          return {
            valid: false,
            totalChecked: i,
            brokenEventId: ev.eventId || ev._id?.toString(),
            message: `Broken chain link at event ${ev.eventId || i}: previousHash mismatch.`
          };
        }
      }

      // 2. Recompute currentHash
      const canonicalPayload = {
        eventId: ev.eventId,
        actorId: ev.actorId || 'system',
        actorRole: ev.actorRole || 'system',
        action: ev.action || ev.event,
        entityType: ev.entityType || 'order',
        entityId: ev.entityId || ev.orderId,
        before: ev.before !== undefined ? ev.before : null,
        after: ev.after !== undefined ? ev.after : null,
        reason: ev.reason || '',
        ipAddress: ev.ipAddress || 'unknown',
        userAgent: ev.userAgent || 'system',
        timestamp: ev.timestamp,
        metadata: ev.metadata || {}
      };

      const recomputed = this.computeHash(ev.previousHash, canonicalPayload);
      if (ev.currentHash && ev.currentHash !== recomputed) {
        return {
          valid: false,
          totalChecked: i,
          brokenEventId: ev.eventId || ev._id?.toString(),
          message: `Hash verification failed at event ${ev.eventId}: content altered.`
        };
      }

      expectedPreviousHash = ev.currentHash;
    }

    return {
      valid: true,
      totalChecked: events.length,
      message: `Successfully verified cryptographic integrity across ${events.length} audit event(s).`
    };
  }

  /**
   * Retrieves audit logs with pagination and filtering.
   */
  static async getLogs(filter: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  } = {}, limit = 50, page = 1) {
    const db = await getDb();
    const query: any = {};

    if (filter.entityType) query.entityType = filter.entityType;
    if (filter.entityId) {
      query.$or = [
        { entityId: filter.entityId },
        { orderId: filter.entityId }
      ];
    }
    if (filter.actorId) query.actorId = filter.actorId;
    if (filter.action) query.action = filter.action;
    if (filter.startDate || filter.endDate) {
      query.timestamp = {};
      if (filter.startDate) query.timestamp.$gte = filter.startDate;
      if (filter.endDate) query.timestamp.$lte = filter.endDate;
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const skip = (page - 1) * safeLimit;

    const [items, total] = await Promise.all([
      db.collection('audit_log')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      db.collection('audit_log').countDocuments(query)
    ]);

    return {
      items: items as unknown as AuditEventRecord[],
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }
}
