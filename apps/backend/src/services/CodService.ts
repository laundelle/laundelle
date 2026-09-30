import { getDb } from '@/lib/mongodb';
import { CodCollectionRecord, CodReconciliationStatus } from '@laundelle/types';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { ExceptionService } from './ExceptionService';
import { AuditService } from '@/services/AuditService';
import { generateCodRecordId, buildEntityLookupQuery } from '@laundelle/ids';

export class CodService {
  /**
   * Records a COD collection attempt by a courier driver during delivery.
   */
  static async recordCodCollection(params: {
    orderId: string;
    driverId: string;
    amountCollected: number;
    paymentMethod?: string;
    notes?: string;
    receiptReference?: string;
  }): Promise<CodCollectionRecord> {
    const { orderId, driverId, amountCollected, paymentMethod, notes, receiptReference } = params;

    if (amountCollected === undefined || amountCollected < 0) {
      throw new BadRequestError('A valid non-negative collection amount is required.');
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne(buildEntityLookupQuery(orderId, 'order'));
    if (!order) throw new NotFoundError('Order not found.');

    const driverUser = await db.collection('users').findOne({ _id: driverId as any });
    const driverName = driverUser?.full_name || order.driver?.name || 'Courier Driver';

    const amountExpected = Number(order.total || 0);
    const discrepancyAmount = Math.round((amountCollected - amountExpected) * 100) / 100;

    let reconciliationStatus: CodReconciliationStatus = 'COLLECTED';
    if (discrepancyAmount !== 0) {
      reconciliationStatus = 'DISCREPANCY';
    } else if (amountCollected === 0 && amountExpected > 0) {
      reconciliationStatus = 'FAILED';
    }

    const now = new Date().toISOString();
    const recordId = generateCodRecordId();

    const codRecord: CodCollectionRecord = {
      id: recordId,
      publicId: recordId,
      codRecordId: recordId,
      orderId: order.publicId || order.id || orderId,
      orderNumber: order.publicId || order.id || orderId,
      amountExpected,
      amountCollected,
      discrepancyAmount,
      paymentMethod: paymentMethod || 'Cash on Delivery',
      driverId,
      driverName,
      collectedAt: now,
      receiptReference,
      notes,
      reconciliationStatus,
      createdAt: now
    };

    // 1. Insert into cod_collections collection
    await db.collection('cod_collections').insertOne(codRecord as any);

    // 2. Update order document with codRecord and payment status
    await db.collection('orders').updateOne(
      { id: orderId },
      {
        $set: {
          codRecord,
          paymentStatus: discrepancyAmount === 0 ? 'Paid' : 'Pending',
          isPaid: discrepancyAmount === 0,
          updated_at: now
        },
        $push: {
          timeline_events: {
            event: 'cod_collected',
            label: `Cash on Delivery Collected: £${amountCollected.toFixed(2)} (Expected £${amountExpected.toFixed(2)})`,
            actor: 'driver',
            actorId: driverId,
            timestamp: now,
            discrepancy: discrepancyAmount !== 0 ? discrepancyAmount : undefined
          }
        } as any
      }
    );

    // 3. If there is a discrepancy, automatically raise a financial operational exception
    if (discrepancyAmount !== 0) {
      await ExceptionService.createException({
        orderId,
        orderNumber: order.id,
        type: 'COD_discrepancy',
        priority: 'high',
        plantId: order.plant_id,
        description: `COD Discrepancy detected: Expected £${amountExpected.toFixed(2)}, driver collected £${amountCollected.toFixed(2)} (Variance: £${discrepancyAmount.toFixed(2)}).`,
        evidence: {
          driverId,
          driverName,
          amountExpected,
          amountCollected,
          discrepancyAmount,
          notes,
          receiptReference
        }
      });
    }

    // 4. Log audit event
    await AuditService.recordOrderEvent({
      orderId,
      action: 'cod_collected',
      actorId: driverId,
      actorRole: 'driver',
      before: { paymentStatus: order.paymentStatus },
      after: { paymentStatus: discrepancyAmount === 0 ? 'Paid' : 'Pending', amountCollected },
      metadata: { amountExpected, amountCollected, discrepancyAmount, receiptReference }
    });

    return codRecord;
  }

  /**
   * Fetches all COD collection records for reconciliation dashboard.
   */
  static async getCodRecords(filter: { reconciliationStatus?: string; driverId?: string } = {}, limit = 100) {
    const db = await getDb();
    const query: any = {};
    if (filter.reconciliationStatus && filter.reconciliationStatus !== 'ALL') {
      query.reconciliationStatus = filter.reconciliationStatus;
    }
    if (filter.driverId) {
      query.driverId = filter.driverId;
    }

    const records = await db.collection('cod_collections')
      .find(query)
      .sort({ collectedAt: -1 })
      .limit(limit)
      .toArray();

    return records as unknown as CodCollectionRecord[];
  }
}
