import { getDb } from '@/lib/mongodb';
import { EvidenceRecord, EvidenceType } from '@laundelle/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api';
import { generateEvidenceId, buildEntityLookupQuery } from '@laundelle/ids';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export class EvidenceService {
  /**
   * Validates and records evidence metadata into the evidence collection.
   */
  static async recordEvidence(params: {
    orderId: string;
    type: EvidenceType;
    uploadedBy: string;
    uploadedByRole: string;
    url: string;
    mimeType?: string;
    size?: number;
    checksum?: string;
  }): Promise<EvidenceRecord> {
    const { orderId, type, uploadedBy, uploadedByRole, url, mimeType = 'image/jpeg', size = 0, checksum } = params;

    if (!orderId || !type || !url) {
      throw new BadRequestError('Missing mandatory evidence fields: orderId, type, url.');
    }

    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      throw new BadRequestError(`Invalid file format: ${mimeType}. Allowed formats: JPEG, PNG, WebP, PDF.`);
    }

    if (size && size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError('File exceeds maximum allowable size of 5MB.');
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne(buildEntityLookupQuery(orderId, 'order'));
    if (!order) throw new NotFoundError('Associated order not found.');

    const fileId = generateEvidenceId();
    const now = new Date().toISOString();

    const record: EvidenceRecord = {
      id: fileId,
      publicId: fileId,
      evidenceId: fileId,
      fileId,
      orderId: order.publicId || order.id || orderId,
      type,
      uploadedBy,
      uploadedByRole,
      uploadedAt: now,
      mimeType,
      size,
      url,
      checksum,
      createdAt: now
    };

    await db.collection('evidence').insertOne(record as any);

    return record;
  }

  /**
   * Retrieves all evidence attachments for an order, enforcing strict cross-customer authorization.
   */
  static async getOrderEvidence(orderId: string, requesterId: string, requesterRole: string): Promise<EvidenceRecord[]> {
    const db = await getDb();
    const order = await db.collection('orders').findOne({ id: orderId });
    if (!order) throw new NotFoundError('Order not found.');

    const normRole = (requesterRole || 'customer').toLowerCase();

    // Customers can only access evidence for their own orders
    if (normRole === 'customer') {
      if (order.customer_id && String(order.customer_id) !== String(requesterId)) {
        throw new ForbiddenError('Access Denied: You do not own this order evidence.');
      }
    }

    // Drivers can only access evidence if assigned to the order or for their plant
    if (normRole === 'driver') {
      const isAssigned = String(order.assigned_driver_id) === String(requesterId);
      if (!isAssigned) {
        throw new ForbiddenError('Access Denied: You are not authorized to view evidence for this order.');
      }
    }

    const items = await db.collection('evidence')
      .find({ orderId })
      .sort({ uploadedAt: -1 })
      .toArray();

    return items as unknown as EvidenceRecord[];
  }
}
